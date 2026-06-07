cask "sourceforge" do
  version "0.9.0"
  sha256 "<INSERT_SHA256>"

  url "https://github.com/trac41799/agent-control-center/releases/download/v#{version}/SourceForge_#{version}_aarch64.dmg"
  name "SourceForge"
  desc "AI agent orchestration platform with wave execution and knowledge compounding"
  homepage "https://github.com/trac41799/agent-control-center"

  auto_updates true

  app "SourceForge.app"

  zap trash: [
    "~/Library/Application Support/dev.sourceforge.app",
    "~/Library/Caches/dev.sourceforge.app",
    "~/Library/WebKit/dev.sourceforge.app",
    "~/Library/Saved Application State/dev.sourceforge.app.savedState",
  ]
end
