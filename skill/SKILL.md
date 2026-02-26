---
name: knowledge
description: >
  Gives you access to documentation and knowledge bases, allowing you to query and retrieve information from them. Perfect for when you need to understand APIs, libraries or specific concepts.
license: MIT
metadata:
  version: "${VERSION}"
  repository: https://github.com/mrsimpson/agentic-knowledge-mcp
  author: mrsimpson
requires-mcp-servers:
  - name: agentic-knowledge
    package: "@codemcp/knowledge"
    description: "Exposes locally stored docs"
    command: npx
    args: ["-y", "@codemcp/knowledge"]
---
