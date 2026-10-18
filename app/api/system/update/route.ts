import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import path from "path";
import { auth } from "@/lib/auth";

const execAsync = promisify(exec);

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

  // Detached HEAD: HEAD enthält direkt den Commit.
  if (!head.startsWith("ref:")) {
    return { branch: "detached", commit: head.slice(0, 7) };
  }

  const ref = head.slice(4).trim(); // z. B. refs/heads/beta
  const branch = ref.replace(/^refs\/heads\//, "") || "unknown";

  let commit = "";
  try {
    commit = (await fs.readFile(path.join(gitDir, ref), "utf8")).trim();
  } catch {
    // Nach `git pack-refs` liegt der Ref in packed-refs.
    try {
      const packed = await fs.readFile(path.join(gitDir, "packed-refs"), "utf8");
      const line = packed
        .split("\n")
        .find((entry) => entry.endsWith(` ${ref}`));
      if (line) commit = line.split(" ")[0].trim();
    } catch {
      commit = "";
    }
  }

  return {
    branch,
    commit: commit ? commit.slice(0, 7) : "unknown",
  };
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

// ─── GET: Versionsstand / Status ─────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
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
      const { stdout } = await execAsync("git branch --show-current", { cwd });
      currentBranch = stdout.trim() || "main";
    } catch (e) {
      console.warn("Could not get current git branch", e);
    }

    let localCommit = "v0.3.0";
    try {
      const { stdout } = await execAsync("git rev-parse --short HEAD", { cwd });
      localCommit = stdout.trim() || "v0.3.0";
    } catch (e) {
      console.warn("Could not get local commit", e);
    }

    let remoteUrl = "https://github.com/Donmeusi/cryptotracker.git";
    try {
      const { stdout } = await execAsync("git remote get-url origin", { cwd });
      remoteUrl = stdout.trim() || remoteUrl;
    } catch (e) {
      console.warn("Could not get remote url", e);
    }

    let remoteCommit = localCommit;
    let updatesAvailable = false;
    try {
      const { stdout } = await execAsync(`git ls-remote origin ${currentBranch}`, { cwd });
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
      remoteUrl,
      updatesAvailable,
    });
  } catch (error: unknown) {
    console.error("System update GET error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to check version" },
      { status: 500 }
    );
  }
}

// ─── POST: Update anfordern bzw. ausführen ───────────────────────────────────

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
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
          requestedBy: session.user.email || session.user.id,
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

  try {
    const body = await req.json();
    const targetBranch = body.targetBranch || "beta";
    if (!isBranch(targetBranch)) {
      return NextResponse.json(
        { error: "Unbekannter Branch. Erlaubt sind main und beta." },
        { status: 400 }
      );
    }
    const repoUrl = typeof body.repoUrl === "string" ? body.repoUrl.trim() : "";
    const cwd = process.cwd();
    const logs: string[] = [];

    // 1. Update Remote URL if provided
    if (repoUrl) {
      try {
        await execAsync(`git remote set-url origin ${repoUrl}`, { cwd });
        logs.push(`Remote-URL auf ${repoUrl} gesetzt.`);
      } catch {
        try {
          await execAsync(`git remote add origin ${repoUrl}`, { cwd });
          logs.push(`Remote origin hinzugefügt: ${repoUrl}`);
        } catch (err: unknown) {
          logs.push(`Remote-URL Hinweis: ${getErrorMessage(err)}`);
        }
      }
    }

    // 2. Git Fetch
    try {
      const { stdout } = await execAsync("git fetch origin", { cwd });
      logs.push("Git fetch origin erfolgreich ausgeführt.");
      if (stdout.trim()) logs.push(stdout.trim());
    } catch (e: unknown) {
      logs.push(`Git fetch Warnung: ${getErrorMessage(e)}`);
    }

    // 3. Git Checkout target branch
    try {
      const { stdout, stderr } = await execAsync(`git checkout ${targetBranch}`, { cwd });
      logs.push(`Erfolgreich auf Branch '${targetBranch}' gewechselt.`);
      if (stdout.trim()) logs.push(stdout.trim());
      if (stderr.trim()) logs.push(stderr.trim());
    } catch {
      try {
        await execAsync(`git checkout -b ${targetBranch} origin/${targetBranch}`, { cwd });
        logs.push(`Branch '${targetBranch}' neu von origin/${targetBranch} ausgecheckt.`);
      } catch (err: unknown) {
        logs.push(`Checkout Fehler: ${getErrorMessage(err)}`);
      }
    }

    // 4. Git Pull
    try {
      const { stdout } = await execAsync(`git pull origin ${targetBranch}`, { cwd });
      logs.push(`Git pull origin ${targetBranch} erfolgreich.`);
      if (stdout.trim()) logs.push(stdout.trim());
    } catch (e: unknown) {
      logs.push(`Git pull Hinweis: ${getErrorMessage(e)}`);
    }

    // 5. Dependencies, Build & Datenbank
    try {
      await execAsync("npm install", { cwd });
      logs.push("Abhängigkeiten installiert.");
    } catch (e: unknown) {
      logs.push(`npm install Hinweis: ${getErrorMessage(e)}`);
    }
    try {
      await execAsync("npx prisma db push --skip-generate", { cwd });
      logs.push("Datenbank-Schema synchronisiert.");
      await execAsync("npx prisma generate", { cwd });
      logs.push("Prisma Client neu generiert.");
    } catch (e: unknown) {
      logs.push(`Prisma Sync Hinweis: ${getErrorMessage(e)}`);
    }
    try {
      await execAsync("npm run build", { cwd, timeout: 600000 });
      logs.push("Produktions-Build abgeschlossen. App neu starten, damit der Build aktiv wird.");
    } catch (e: unknown) {
      logs.push(`Build Hinweis: ${getErrorMessage(e)}`);
    }

    // 6. Get updated commit info
    let updatedCommit = "v0.3.0";
    try {
      const { stdout } = await execAsync("git rev-parse --short HEAD", { cwd });
      updatedCommit = stdout.trim();
    } catch {
      // ignore
    }

    return NextResponse.json({
      success: true,
      mode: "native",
      currentBranch: targetBranch,
      updatedCommit,
      logs,
    });
  } catch (error: unknown) {
    console.error("System update POST error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) || "Update execution failed" },
      { status: 500 }
    );
  }
}
