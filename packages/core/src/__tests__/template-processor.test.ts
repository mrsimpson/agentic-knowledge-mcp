/**
 * Tests for template processing functionality
 */

import { describe, test, expect } from "vitest";
import {
  processTemplate,
  getEffectiveTemplate,
  validateTemplate,
  extractVariables,
  createTemplateContext,
} from "../templates/processor.js";
import {
  KnowledgeError,
  ErrorType,
  DEFAULT_TEMPLATE,
  ALLOWED_TEMPLATE_VARIABLES,
} from "../types.js";
import type { TemplateContext, DocsetConfig } from "../types.js";

describe("Template Processing", () => {
  const sampleDocset: DocsetConfig = {
    id: "test-docs",
    name: "Test Documentation",
    description: "Sample documentation for testing",
    local_path: "./docs",
  };

  const sampleContext: TemplateContext = {
    local_path: "/project/docs",
    keywords: "react hooks",
    generalized_keywords: "react state management",
    docset: sampleDocset,
  };

  describe("processTemplate - core functionality", () => {
    test("should replace all valid template variables", () => {
      const template = `Search "{{keywords}}" in {{local_path}} ({{docset_name}}). Also try: {{generalized_keywords}}. Description: {{docset_description}}`;

      const result = processTemplate(template, sampleContext);

      expect(result).toBe(
        'Search "react hooks" in /project/docs (Test Documentation). Also try: react state management. Description: Sample documentation for testing',
      );
    });

    test("should handle missing description gracefully", () => {
      const docsetWithoutDescription: DocsetConfig = {
        id: "minimal",
        name: "Minimal Docs",
        local_path: "./minimal",
      };

      const context: TemplateContext = {
        ...sampleContext,
        docset: docsetWithoutDescription,
      };

      const template = 'Description: "{{docset_description}}"';
      const result = processTemplate(template, context);

      expect(result).toBe('Description: ""');
    });

    test("should throw error for invalid variables in processed template", () => {
      const template = "Valid: {{keywords}}, Invalid: {{unknown_variable}}";

      expect(() => processTemplate(template, sampleContext)).toThrow(
        KnowledgeError,
      );

      try {
        processTemplate(template, sampleContext);
      } catch (error) {
        expect(error).toBeInstanceOf(KnowledgeError);
        expect((error as KnowledgeError).type).toBe(ErrorType.TEMPLATE_ERROR);
        expect((error as KnowledgeError).message).toContain(
          "invalid variables",
        );
      }
    });

    test("should handle whitespace in variable names", () => {
      const template = "Search {{ keywords }} in {{ local_path }}";

      const result = processTemplate(template, sampleContext);

      expect(result).toBe("Search react hooks in /project/docs");
    });
  });

  describe("validateTemplate - validation at startup", () => {
    test("should accept valid template with required variables", () => {
      const validTemplate = "Search {{keywords}} in {{local_path}}";

      expect(() => validateTemplate(validTemplate)).not.toThrow();
    });

    test("should accept template with all allowed variables", () => {
      const fullTemplate =
        "{{keywords}} {{generalized_keywords}} {{local_path}} {{docset_id}} {{docset_name}} {{docset_description}}";

      expect(() => validateTemplate(fullTemplate)).not.toThrow();
    });

    test("should reject template with invalid variables", () => {
      const invalidTemplate =
        "Search {{keywords}} in {{local_path}} with {{invalid_variable}}";

      expect(() => validateTemplate(invalidTemplate)).toThrow(KnowledgeError);

      try {
        validateTemplate(invalidTemplate);
      } catch (error) {
        expect(error).toBeInstanceOf(KnowledgeError);
        expect((error as KnowledgeError).type).toBe(ErrorType.TEMPLATE_ERROR);
        expect((error as KnowledgeError).message).toContain(
          "invalid variables: invalid_variable",
        );
        expect((error as KnowledgeError).message).toContain(
          "Allowed variables:",
        );
      }
    });

    test("should reject template missing required variables", () => {
      const incompleteTemplate = "Only has {{keywords}}";

      expect(() => validateTemplate(incompleteTemplate)).toThrow(
        KnowledgeError,
      );

      try {
        validateTemplate(incompleteTemplate);
      } catch (error) {
        expect(error).toBeInstanceOf(KnowledgeError);
        expect((error as KnowledgeError).message).toContain(
          "missing required variables: local_path",
        );
      }
    });

    test("should reject template with multiple invalid variables", () => {
      const template = "{{keywords}} {{local_path}} {{bad_var1}} {{bad_var2}}";

      expect(() => validateTemplate(template)).toThrow(KnowledgeError);

      try {
        validateTemplate(template);
      } catch (error) {
        expect((error as KnowledgeError).message).toContain("bad_var1");
        expect((error as KnowledgeError).message).toContain("bad_var2");
      }
    });
  });

  describe("extractVariables - parsing functionality", () => {
    test("should extract all variables from complex template", () => {
      const template =
        "Search {{keywords}} in {{local_path}} for {{docset_name}} ({{docset_id}})";

      const result = extractVariables(template);

      expect(result).toEqual([
        "keywords",
        "local_path",
        "docset_name",
        "docset_id",
      ]);
    });

    test("should handle variables with whitespace", () => {
      const template = "Search {{ keywords }} in {{  local_path  }}";

      const result = extractVariables(template);

      expect(result).toEqual(["keywords", "local_path"]);
    });

    test("should return empty array for template without variables", () => {
      const template = "Static template with no variables";

      const result = extractVariables(template);

      expect(result).toEqual([]);
    });

    test("should preserve duplicate variables", () => {
      const template = "Search {{keywords}} and also {{keywords}} again";

      const result = extractVariables(template);

      expect(result).toEqual(["keywords", "keywords"]);
    });
  });

  describe("getEffectiveTemplate - template resolution", () => {
    test("should prioritize docset template over global and default", () => {
      const docsetWithTemplate: DocsetConfig = {
        ...sampleDocset,
        template: "Docset-specific template",
      };

      const result = getEffectiveTemplate(
        docsetWithTemplate,
        "Global template",
      );

      expect(result).toBe("Docset-specific template");
    });

    test("should use global template when docset has none", () => {
      const result = getEffectiveTemplate(sampleDocset, "Global template");

      expect(result).toBe("Global template");
    });

    test("should fallback to default template", () => {
      const result = getEffectiveTemplate(sampleDocset);

      expect(result).toBe(DEFAULT_TEMPLATE);
    });
  });

  describe("integration with strict validation", () => {
    test("should validate default template is compliant", () => {
      expect(() => validateTemplate(DEFAULT_TEMPLATE)).not.toThrow();
    });

    test("should validate that all required variables are in default template", () => {
      const variables = extractVariables(DEFAULT_TEMPLATE);

      expect(variables).toContain("keywords");
      expect(variables).toContain("local_path");
      expect(variables).toContain("generalized_keywords");
    });

    test("should ensure all variables in default template are allowed", () => {
      const variables = extractVariables(DEFAULT_TEMPLATE);

      variables.forEach((variable) => {
        expect(ALLOWED_TEMPLATE_VARIABLES).toContain(variable as any);
      });
    });
  });

  describe("edge cases and error handling", () => {
    test("should handle template with only required variables", () => {
      const minimalTemplate = "Search {{keywords}} in {{local_path}}";

      expect(() => validateTemplate(minimalTemplate)).not.toThrow();

      const result = processTemplate(minimalTemplate, sampleContext);
      expect(result).toBe("Search react hooks in /project/docs");
    });

    test("should handle empty template gracefully", () => {
      expect(() => validateTemplate("")).toThrow(KnowledgeError);
    });

    test("should handle malformed variable syntax", () => {
      const malformed = "Search {keywords} in {{local_path}}";

      expect(() => validateTemplate(malformed)).toThrow();
    });
  });
});
