# Example Configuration

This directory contains example configuration files for the agentic knowledge system.

## Basic Configuration (`config.yaml`)

Place this file in a `.knowledge/` directory in your project root:

```yaml
version: "1.0"
docsets:
  - id: "my-project-docs"
    name: "My Project Documentation"
    description: "Main project documentation and guides"
    local_path: "./docs"
  - id: "api-reference"
    name: "API Reference"
    description: "API documentation and reference materials"
    local_path: "./api-docs"
template: |
  Search for '{{keywords}}' in {{docset_name}} ({{docset_description}}).
  
  **Location**: {{local_path}}
  **Primary Terms**: {{keywords}}
  **Related Terms**: {{generalized_keywords}}
  
  **Strategy**:
  1. Use grep/rg to search for: {{keywords}}
  2. If needed, expand to: {{generalized_keywords}}
  3. Check common file types: .md, .mdx, .rst, .txt
  4. Look in typical locations: README, docs/, guides/, examples/
```

## Advanced Configuration with Custom Templates

```yaml
version: "1.0"
docsets:
  - id: "react-docs"
    name: "React Documentation"
    description: "React framework documentation and tutorials"
    local_path: "./node_modules/react/docs"
    template: |
      Looking for React information about '{{keywords}}'.
      Search {{local_path}} using these approaches:
      1. Component docs: search for component names, props, hooks
      2. API reference: look for method signatures and parameters
      3. Examples: check code samples and usage patterns
      Related concepts: {{generalized_keywords}}
  
  - id: "project-source"
    name: "Project Source Code"
    description: "Main application source code"
    local_path: "./src"
    template: |
      Searching project source for '{{keywords}}'.
      Location: {{local_path}}
      Focus on: implementation files, tests, utilities
      Expand search with: {{generalized_keywords}}

# Global template (used when docset doesn't have its own)
template: |
  Search for documentation about '{{keywords}}' in {{docset_name}}.
  Path: {{local_path}}
  Also consider: {{generalized_keywords}}
```

## Configuration File Location

The configuration file should be placed at:
```
your-project/
├── .knowledge/
│   └── config.yaml
├── docs/
├── src/
└── README.md
```

The system will search upward from the current directory to find the `.knowledge/config.yaml` file.