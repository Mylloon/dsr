using System.Diagnostics;

string shell;

try
{
    string newps = "pwsh.exe";
    Process.Start(new ProcessStartInfo
    {
        FileName = newps,
        Arguments = "-NoProfile -Command \"exit\"",
        UseShellExecute = false
    })?.WaitForExit();

    shell = newps;
}
catch
{
    shell = "powershell.exe";
}

var psi = new ProcessStartInfo
{
    FileName = shell,
    Arguments = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -Command \"irm -UserAgent '_' https://git.mylloon.fr/Anri/dsr/raw/branch/main/install.ps1 | iex\"",
    UseShellExecute = false
};

Process.Start(psi);
