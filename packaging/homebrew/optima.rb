# frozen_string_literal: true

# Homebrew formula stub for Optima.
# Publish via a tap, e.g. julienlhk/homebrew-tap, after npm package is live:
#   brew install julienlhk/tap/optima
#
# This formula installs the Node CLI from npm (optima-ai).

class Optima < Formula
  desc "AI agent & token optimization — installs skills/rules into your repo"
  homepage "https://github.com/julienlhk/optima"
  url "https://registry.npmjs.org/optima-ai/-/optima-ai-1.0.0.tgz"
  # sha256 "REPLACE_AFTER_NPM_PUBLISH"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", "-g", "optima-ai@#{version}", "--prefix", libexec
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    assert_match "optima", shell_output("#{bin}/optima help")
  end
end
