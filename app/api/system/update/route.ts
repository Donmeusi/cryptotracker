import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import path from "path";
import { adminErrorResponse, getAdminSession } from "@/lib/authz";

const execFileAsync = promisify(execFile);

const CONTAINER_MODE = process.env.CONTAINER_MODE === "true";
const REPO_DIR = process.env.REPO_DIR || "/repo";
const UPDATE_DIR = process.env.UPDATE_DIR || "/update";
const UPDATE_REPO = process.env.UPDATE_REPO || "Donmeusi/cryptotracker";
const ALLOWED_BRANCHES = ["main", "beta"] as const;
type Branch = (typeof ALLOWED_BRANCHES)[number];

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function isBranch(value: unknown): value is Branch {
  return typeof value === "string" && ALLOWED_BRANCHES.includes(value as Branch);
}

// ─── Container-Modus: Quellstand und Status vom Host lesen ───────────────────

async function readGitInfo(
  repoDir: string
): Promise<{ branch: string; commit: string }> {
  const gitDir = path.join(repoDir, ".git");

  let head = "";
  try {
    head = (await fs.readFile(path.join(gitDir, "HEAD"), "utf8")).trim();
  } catch {
    return { branch: "unknown", commit: "unknown" };
  }

  if (!head.startsWith("ref:")) {
    return { branch: "detached", commit: head.slice(0, 7) };
  }

  const ref = head.slice(4).trim();
  const branch = ref.replace(/^refs\/heads\//, "") || "unknown";

  let commit = "";
  try {
    commit = (await fs.readFile(path.join(gitDir, ref), "utf8")).trim();
  } catch {
    try {
      const packed = await fs.readFile(path.join(gitDir, "packed-refs"), "utf8");
      const line = packed.split("\n").find((entry) => entry.endsWith(` ${ref}`));
      if (line) commit = line.split(" ")[0].trim();
    } catch {
      commit = "";
    }
  }

  return { branch, commit: commit ? commit.slice(0, 7) : "unknown" };
}

type UpdateStatus = {
  state?: "queued" | "running" | "done" | "error";
  branch?: string;
  commit?: string;
  message?: string;
  startedAt?: string;
  finishedAt?: string;
  log?: string;
};

async function readStatus(): Promise<UpdateStatus | null> {
  try {
    const raw = await fs.readFile(path.join(UPDATE_DIR, "status.json"), "utf8");
    return JSON.parse(raw) as UpdateStatus;
  } catch {
    return null;
  }
}

async function hasPendingRequest(): Promise<boolean> {
  try {
    await fs.access(path.join(UPDATE_DIR, "request.json"));
    return true;
  } catch {
    return false;
  }
}

async function fetchRemoteCommit(branch: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${UPDATE_REPO}/commits/${encodeURIComponent(branch)}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "cryptotracker-updater",
        },
        next: { revalidate: 60 },
      }
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { sha?: string };
    return data.sha ? data.sha.slice(0, 7) : null;
  } catch {
    return null;
  }
}

// ─── GET: Versionsstand / Status (nur Admin) ────────────────────────────────

export async function GET() {
  const admin = await getAdminSession();
  if (admin.status !== 200) {
    return NextResponse.json(adminErrorResponse(admin.status), {
      status: admin.status,
    });
  }

  if (CONTAINER_MODE) {
    const git = await readGitInfo(REPO_DIR);
    const [remoteCommit, status, pending] = await Promise.all([
      fetchRemoteCommit(git.branch),
      readStatus(),
      hasPendingRequest(),
    ]);

    return NextResponse.json({
      mode: "container",
      container: true,
      currentBranch: git.branch,
      localCommit: git.commit,
      remoteCommit: remoteCommit ?? git.commit,
      repoUrl: `https://github.com/${UPDATE_REPO}`,
      updatesAvailable: Boolean(remoteCommit && remoteCommit !== git.commit),
      pending,
      status,
    });
  }

  try {
    const cwd = process.cwd();

    let currentBranch = "main";
    try {
      const { stdout } = await execFileAsync("git", ["branch", "--show-current"], { cwd });
      currentBranch = stdout.trim() || "main";
    } catch (e) {
      console.warn("Could not get current git branch", e);
    }

    let localCommit = "unbekannt";
    try {
      const { stdout } = await execFileAsync("git", ["rev-parse", "--short", "HEAD"], { cwd });
      localCommit = stdout.trim() || "unbekannt";
    } catch (e) {
      console.warn("Could not get local commit", e);
    }

    let remoteCommit = localCommit;
    let updatesAvailable = false;
    try {
      const { stdout } = await execFileAsync(
        "git",
        ["ls-remote", "origin", currentBranch],
        { cwd }
      );
      const parts = stdout.trim().split(/\s+/);
      if (parts[0]) {
        remoteCommit = parts[0].slice(0, 7);
        updatesAvailable = remoteCommit !== localCommit;
      }
    } catch (e) {
      console.warn("Could not fetch remote commit info", e);
    }

    return NextResponse.json({
      mode: "native",
      container: false,
      currentBranch,
      localCommit,
      remoteCommit,
      repoUrl: `https://github.com/${UPDATE_REPO}`,
      updatesAvailable,
    });
  } catch (error: unknown) {
    console.error("System update GET error:", error);
    return NextResponse.json(
      { error: "Versionsstand konnte nicht gelesen werden." },
      { status: 500 }
    );
  }
}

// ─── POST: Update anfordern bzw. ausführen (nur Admin) ──────────────────────

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (admin.status !== 200) {
    return NextResponse.json(adminErrorResponse(admin.status), {
      status: admin.status,
    });
  }

  if (CONTAINER_MODE) {
    try {
      const body = (await req.json()) as { targetBranch?: unknown };
      const targetBranch = body.targetBranch ?? "beta";
      if (!isBranch(targetBranch)) {
        return NextResponse.json(
          { error: "Unbekannter Branch. Erlaubt sind main und beta." },
          { status: 400 }
        );
      }

      await fs.mkdir(UPDATE_DIR, { recursive: true });
      const requestPath = path.join(UPDATE_DIR, "request.json");
      const tempPath = path.join(
        UPDATE_DIR,
        `.request-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
      );

      await fs.writeFile(
        tempPath,
        JSON.stringify({
          targetBranch,
          requestedAt: new Date().toISOString(),
          requestedBy: admin.user.email,
        }),
        "utf8"
      );
      await fs.rename(tempPath, requestPath);

      const git = await readGitInfo(REPO_DIR);

      return NextResponse.json({
        success: true,
        queued: true,
        mode: "container",
        currentBranch: git.branch,
        updatedCommit: git.commit,
        logs: [
          `Update auf '${targetBranch}' angefordert.`,
          "Der Host-Agent baut den Container im Hintergrund neu.",
          "Die App startet während des Updates neu – diese Seite lädt danach aktualisiert.",
        ],
      });
    } catch (error) {
      console.error("Update-Anforderung fehlgeschlagen:", error);
      return NextResponse.json(
        {
          error:
            "Update konnte nicht angefordert werden. Ist das Verzeichnis /update eingebunden und beschreibbar?",
        },
        { status: 500 }
      );
    }
  }

  // Nativer Modus: feste Argumente statt Shell-Strings, keine frei wählbare
  // Remote-URL mehr.
  try {
    const body = await req.json();
    const targetBranch = body.targetBranch || "beta";
    if (!isBranch(targetBranch)) {
      return NextResponse.json(
        { error: "Unbekannter Branch. Erlaubt sind main und beta." },
        { status: 400 }
      );
    }

    const cwd = process.cwd();
    const logs: string[] = [];
    let failed = false;

    async function run(
      command: string,
      args: string[],
      timeout?: number
    ): Promise<boolean> {
      try {
        const { stdout, stderr } = await execFileAsync(command, args, {
          cwd,
          timeout: timeout ?? 120000,
          maxBuffer: 4 * 1024 * 1024,
        });
        if (stdout?.trim()) logs.push(stdout.trim().slice(0, 4000));
        if (stderr?.trim()) logs.push(stderr.trim().slice(0, 4000));
        return true;
      } catch (error: unknown) {
        failed = true;
        logs.push(`Fehler bei ${command} ${args.join(" ")}: ${getErrorMessage(error)}`);
        return false;
      }
    }

    if (!(await run("git", ["fetch", "origin"]))) {
      return NextResponse.json(
        { success: false, mode: "native", logs },
        { status: 500 }
      );
    }

    if (!(await run("git", ["checkout", targetBranch]))) {
      await run("git", ["checkout", "-b", targetBranch, `origin/${targetBranch}`]);
    }
    await run("git", ["pull", "--ff-only", "origin", targetBranch]);

    await run("npm", ["install"], 600000);
    await run("npx", ["prisma", "generate"], 300000);
    await run("npx", ["prisma", "db", "push", "--skip-generate"], 300000);
    const buildOk = await run("npm", ["run", "build"], 600000);

    if (buildOk) {
      logs.push("Build abgeschlossen. App neu starten, damit der Build aktiv wird.");
    }

    let updatedCommit = "unbekannt";
    try {
      const { stdout } = await execFileAsync("git", ["rev-parse", "--short", "HEAD"], { cwd });
      updatedCommit = stdout.trim();
    } catch {
      // ignore
    }

    return NextResponse.json({
      success: !failed,
      mode: "native",
      currentBranch: targetBranch,
      updatedCommit,
      logs,
    });
  } catch (error: unknown) {
    console.error("System update POST error:", error);
    return NextResponse.json(
      { error: "Update konnte nicht ausgeführt werden." },
      { status: 500 }
    );
  }
}
