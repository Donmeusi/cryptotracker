import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

// GET /api/system/update
export async function GET() {
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
      currentBranch,
      localCommit,
      remoteCommit,
      remoteUrl,
      updatesAvailable,
    });
  } catch (error: unknown) {
    console.error("System update GET error:", error);
    return NextResponse.json({ error: getErrorMessage(error) || "Failed to check version" }, { status: 500 });
  }
}

// POST /api/system/update
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const targetBranch = body.targetBranch || "beta";
    const repoUrl = body.repoUrl?.trim();
    const cwd = process.cwd();
    const logs: string[] = [];

    // 1. Update Remote URL if provided
    if (repoUrl) {
      try {
        await execAsync(`git remote set-url origin ${repoUrl}`, { cwd });
        logs.push(`Remote-URL auf ${repoUrl} gesetzt.`);
      } catch (e) {
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
    } catch (e: unknown) {
      // If branch doesn't exist locally, track remote
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

    // 5. Database Push & Prisma Generate
    try {
      await execAsync("npx prisma db push --skip-generate", { cwd });
      logs.push("Datenbank-Schema erfolgreich synchronisiert.");
      try {
        await execAsync("npx prisma generate", { cwd });
        logs.push("Prisma Client neu generiert.");
      } catch (genErr: unknown) {
        const msg = getErrorMessage(genErr);
        if (msg.includes("EPERM") || msg.includes("query_engine")) {
          logs.push("Prisma Client: DLL während des App-Laufs gesperrt (wird beim nächsten App-Neustart neu kompiliert).");
        } else {
          logs.push(`Prisma Generator Hinweis: ${msg}`);
        }
      }
    } catch (e: unknown) {
      logs.push(`Prisma Sync Hinweis: ${getErrorMessage(e)}`);
    }

    // 6. Get updated commit info
    let updatedCommit = "v0.3.0";
    try {
      const { stdout } = await execAsync("git rev-parse --short HEAD", { cwd });
      updatedCommit = stdout.trim();
    } catch (e) {}

    return NextResponse.json({
      success: true,
      currentBranch: targetBranch,
      updatedCommit,
      logs,
    });
  } catch (error: unknown) {
    console.error("System update POST error:", error);
    return NextResponse.json({ error: getErrorMessage(error) || "Update execution failed" }, { status: 500 });
  }
}
