using System.Diagnostics;

var psi = new ProcessStartInfo
{
    FileName = "powershell",
    Arguments = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -Command \"irm -UserAgent '_' https://git.mylloon.fr/Anri/dsr/raw/branch/main/install.ps1 | iex\"",
    UseShellExecute = false
};

Process.Start(psi);
