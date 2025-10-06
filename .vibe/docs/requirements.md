<!--
INSTRUCTIONS FOR REQUIREMENTS (EARS FORMAT):
- Use EARS format
- Number requirements as REQ-1, REQ-2, etc.
- Keep user stories concise and focused on user value
- Make acceptance criteria specific and testable
- Reference requirements in tasks using: (_Requirements: REQ-1, REQ-3_)

EXAMPLE:
## REQ-1: User Authentication
**User Story:** As a website visitor, I want to create an account so that I can access personalized features.

**Acceptance Criteria:**
- WHEN user provides valid email and password THEN the system SHALL create new account
- WHEN user provides duplicate email THEN the system SHALL show "email already exists" error
- WHEN user provides weak password THEN the system SHALL show password strength requirements

FULL EARS SYNTAX:
While <optional pre-condition>, when <optional trigger>, the <system name> shall <system response>

The EARS ruleset states that a requirement must have: Zero or many preconditions; Zero or one trigger; One system name; One or many system responses.

The application of the EARS notation produces requirements in a small number of patterns, depending on the clauses that are used. The patterns are illustrated below.

Ubiquitous requirements
Ubiquitous requirements are always active (so there is no EARS keyword)

The <system name> shall <system response>

Example: The mobile phone shall have a mass of less than XX grams.

State driven requirements
State driven requirements are active as long as the specified state remains true and are denoted by the keyword While.

While <precondition(s)>, the <system name> shall <system response>

Example: While there is no card in the ATM, the ATM shall display "insert card to begin".

Event driven requirements
Event driven requirements specify how a system must respond when a triggering event occurs and are denoted by the keyword When.

When <trigger>, the <system name> shall <system response>

Example: When "mute" is selected, the laptop shall suppress all audio output.

Optional feature requirements
Optional feature requirements apply in products or systems that include the specified feature and are denoted by the keyword Where.

Where <feature is included>, the <system name> shall <system response>

Example: Where the car has a sunroof, the car shall have a sunroof control panel on the driver door.

Unwanted behavior requirements
Unwanted behavior requirements are used to specify the required system response to undesired situations and are denoted by the keywords If and Then.

If <trigger>, then the <system name> shall <system response>

Example: If an invalid credit card number is entered, then the website shall display "please re-enter credit card details".

Complex requirements
The simple building blocks of the EARS patterns described above can be combined to specify requirements for richer system behavior. Requirements that include more than one EARS keyword are called Complex requirements.

While <precondition(s)>, When <trigger>, the <system name> shall <system response>

Example: While the aircraft is on ground, when reverse thrust is commanded, the engine control system shall enable reverse thrust.

Complex requirements for unwanted behavior also include the If-Then keywords.
-->

# Requirements Document

## REQ-1: MCP Search Documentation Tool

**User Story:** As an AI coding assistant, I want to receive navigation instructions for finding documentation so that I can use my existing text search tools to locate relevant information.

**Acceptance Criteria:**

- WHEN AI assistant calls search_docs with valid docset, keywords, and generalized_keywords THEN the system SHALL return navigation instructions
- WHEN AI assistant provides unknown docset name THEN the system SHALL return error with list of available docsets
- WHEN AI assistant provides empty keywords array THEN the system SHALL return validation error
- The system SHALL respond within 10 milliseconds for all valid requests
- The system SHALL use the format "Search for '{keywords}' in folder {local_path}. Use your normal text search tools to do this. If the search results don't help you, try to find '{generalized_keywords}'. If this still doesn't help, ask the user to rephrase it."

## REQ-2: MCP List Docsets Tool

**User Story:** As an AI coding assistant, I want to discover available documentation sets so that I can make informed search requests.

**Acceptance Criteria:**

- WHEN AI assistant calls list_docsets THEN the system SHALL return array of available docsets
- WHEN configuration contains docsets THEN the system SHALL include name, version, aliases, and local_path for each docset
- WHEN no docsets are configured THEN the system SHALL return empty array
- The system SHALL calculate local_path using pattern "{docs_root}/{docset}-{version}/"

## REQ-3: Configuration Discovery

**User Story:** As a developer, I want the system to automatically find my project's knowledge configuration so that I don't need complex setup.

**Acceptance Criteria:**

- WHEN system starts THEN the system SHALL search for .knowledge/config.yaml starting from current directory
- WHEN .knowledge/config.yaml not found in current directory THEN the system SHALL search parent directories
- WHEN .knowledge/config.yaml found THEN the system SHALL load and validate the configuration
- WHEN no .knowledge/config.yaml found in directory tree THEN the system SHALL return configuration error
- The system SHALL NOT use any global fallback configuration files

## REQ-4: YAML Configuration Loading

**User Story:** As a developer, I want to configure docsets using human-readable YAML so that I can easily manage documentation mappings.

**Acceptance Criteria:**

- WHEN system loads config.yaml THEN the system SHALL validate YAML syntax
- WHEN YAML contains invalid syntax THEN the system SHALL return parse error with line number
- WHEN YAML contains unknown properties THEN the system SHALL ignore them without error
- WHEN YAML missing required docsets section THEN the system SHALL return validation error
- The system SHALL support docset configuration with version and aliases properties

## REQ-5: Local Path Calculation

**User Story:** As the system, I want to calculate consistent local paths for documentation so that AI assistants can find the correct folders.

**Acceptance Criteria:**

- WHEN docset has name "react" and version "18.2" THEN the system SHALL calculate local_path as "{docs_root}/react-18.2/"
- WHEN docs_root not specified in configuration THEN the system SHALL use ".knowledge/docs" as default
- WHEN docs_root specified as relative path THEN the system SHALL resolve relative to .knowledge folder location
- The system SHALL use forward slashes in all local_path values regardless of operating system

## REQ-6: Template-Based Instruction Generation

**User Story:** As a developer, I want to customize instruction templates per docset so that I can provide specific guidance for different documentation types.

**Acceptance Criteria:**

- WHEN docset has no custom template THEN the system SHALL use default instruction template
- WHEN docset has custom template THEN the system SHALL use docset-specific template
- WHEN processing template THEN the system SHALL substitute {keywords}, {generalized_keywords}, {local_path}, {docset}, and {version} variables
- WHEN template contains unknown variables THEN the system SHALL leave them unchanged
- The system SHALL join keywords array with comma and space separator

## REQ-7: Error Handling and Validation

**User Story:** As an AI coding assistant, I want clear error messages when something goes wrong so that I can provide helpful feedback to users.

**Acceptance Criteria:**

- WHEN docset name contains invalid characters THEN the system SHALL return validation error
- WHEN keywords array exceeds reasonable size limit THEN the system SHALL return validation error  
- WHEN configuration file cannot be read THEN the system SHALL return file access error
- WHEN docset referenced but not configured THEN the system SHALL return error listing available docsets
- The system SHALL provide specific error messages with actionable remediation steps

## REQ-8: MCP Protocol Compliance

**User Story:** As an AI coding assistant, I want to integrate with the system using standard MCP protocol so that I can use it like other MCP servers.

**Acceptance Criteria:**

- The system SHALL implement MCP JSON-RPC 2.0 protocol over stdio
- The system SHALL register search_docs and list_docsets tools with MCP framework
- WHEN AI assistant calls undefined MCP tool THEN the system SHALL return method not found error
- WHEN AI assistant sends malformed JSON-RPC request THEN the system SHALL return parse error
- The system SHALL follow @modelcontextprotocol/sdk standards for tool definitions

## REQ-9: Performance Requirements

**User Story:** As an AI coding assistant, I want fast responses so that I can provide immediate guidance to users.

**Acceptance Criteria:**

- The system SHALL respond to search_docs requests within 10 milliseconds after configuration load
- The system SHALL respond to list_docsets requests within 5 milliseconds after configuration load
- WHEN configuration file changes THEN the system SHALL reload configuration within 100 milliseconds
- The system SHALL cache loaded configuration until file modification detected
- The system SHALL minimize memory allocation during request processing

## REQ-10: NPM Package Distribution

**User Story:** As a developer, I want to install the system as an NPM package so that I can easily add it to my development environment.

**Acceptance Criteria:**

- The system SHALL be distributable as NPM package
- The system SHALL provide executable binary for MCP server
- WHEN installed globally THEN the system SHALL be available as "agentic-knowledge-mcp" command  
- The system SHALL follow semantic versioning for releases
- The system SHALL include TypeScript type definitions for programmatic use