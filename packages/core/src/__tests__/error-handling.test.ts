/**
 * Tests for error handling and edge cases
 */

import { describe, test, expect } from "vitest";
import { KnowledgeError, ErrorType } from "../types.js";

describe("Error Handling", () => {
  describe("KnowledgeError", () => {
    test("should create error with type and message", () => {
      const error = new KnowledgeError(
        ErrorType.CONFIG_NOT_FOUND,
        "Configuration file not found",
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(KnowledgeError);
      expect(error.type).toBe(ErrorType.CONFIG_NOT_FOUND);
      expect(error.message).toBe("Configuration file not found");
      expect(error.name).toBe("KnowledgeError");
    });

    test("should create error with context", () => {
      const context = { configPath: "/path/to/config.yaml", line: 5 };
      const error = new KnowledgeError(
        ErrorType.YAML_PARSE_ERROR,
        "Invalid YAML syntax",
        context,
      );

      expect(error.context).toEqual(context);
      expect(error.context?.configPath).toBe("/path/to/config.yaml");
      expect(error.context?.line).toBe(5);
    });

    test("should handle error without context", () => {
      const error = new KnowledgeError(
        ErrorType.CONFIG_INVALID,
        "Invalid configuration structure",
      );

      expect(error.context).toBeUndefined();
    });

    test("should preserve error stack trace", () => {
      const error = new KnowledgeError(
        ErrorType.TEMPLATE_ERROR,
        "Template processing failed",
      );

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("KnowledgeError");
    });
  });

  describe("ErrorType enum", () => {
    test("should have all expected error types", () => {
      expect(ErrorType.CONFIG_NOT_FOUND).toBe("CONFIG_NOT_FOUND");
      expect(ErrorType.CONFIG_INVALID).toBe("CONFIG_INVALID");
      expect(ErrorType.DOCSET_NOT_FOUND).toBe("DOCSET_NOT_FOUND");
      expect(ErrorType.PATH_INVALID).toBe("PATH_INVALID");
      expect(ErrorType.TEMPLATE_ERROR).toBe("TEMPLATE_ERROR");
      expect(ErrorType.YAML_PARSE_ERROR).toBe("YAML_PARSE_ERROR");
    });

    test("should have string values for all error types", () => {
      const errorTypes = Object.values(ErrorType);

      expect(errorTypes).toHaveLength(6);
      errorTypes.forEach((type) => {
        expect(typeof type).toBe("string");
        expect(type.length).toBeGreaterThan(0);
      });
    });
  });

  describe("error context handling", () => {
    test("should handle complex context objects", () => {
      const complexContext = {
        configPath: "/complex/path/config.yaml",
        docset: {
          id: "test",
          name: "Test Docs",
          local_path: "./docs",
        },
        line: 10,
        column: 5,
        nested: {
          property: "value",
          array: [1, 2, 3],
        },
      };

      const error = new KnowledgeError(
        ErrorType.CONFIG_INVALID,
        "Complex error scenario",
        complexContext,
      );

      expect(error.context).toEqual(complexContext);
      expect(error.context?.nested?.property).toBe("value");
      expect(error.context?.nested?.array).toEqual([1, 2, 3]);
    });

    test("should handle null and undefined context values", () => {
      const contextWithNulls = {
        configPath: null,
        undefinedValue: undefined,
        emptyString: "",
        zero: 0,
        falsy: false,
      };

      const error = new KnowledgeError(
        ErrorType.PATH_INVALID,
        "Error with null values",
        contextWithNulls,
      );

      expect(error.context?.configPath).toBeNull();
      expect(error.context?.undefinedValue).toBeUndefined();
      expect(error.context?.emptyString).toBe("");
      expect(error.context?.zero).toBe(0);
      expect(error.context?.falsy).toBe(false);
    });
  });

  describe("error serialization", () => {
    test("should have accessible error properties", () => {
      const error = new KnowledgeError(
        ErrorType.DOCSET_NOT_FOUND,
        "Docset not found",
        { docsetId: "missing-docs", searchPath: "/project" },
      );

      // Test that properties are accessible (Error serialization is complex)
      expect(error.name).toBe("KnowledgeError");
      expect(error.message).toBe("Docset not found");
      expect(error.type).toBe(ErrorType.DOCSET_NOT_FOUND);
      expect(error.context).toEqual({
        docsetId: "missing-docs",
        searchPath: "/project",
      });

      // Test manual serialization
      const manualSerialized = {
        name: error.name,
        message: error.message,
        type: error.type,
        context: error.context,
      };

      expect(manualSerialized.name).toBe("KnowledgeError");
      expect(manualSerialized.message).toBe("Docset not found");
      expect(manualSerialized.type).toBe(ErrorType.DOCSET_NOT_FOUND);
      expect(manualSerialized.context).toEqual({
        docsetId: "missing-docs",
        searchPath: "/project",
      });
    });

    test("should handle circular references in context", () => {
      const circularObj: any = { name: "circular" };
      circularObj.self = circularObj;

      const error = new KnowledgeError(
        ErrorType.TEMPLATE_ERROR,
        "Circular reference error",
        { circular: circularObj },
      );

      // Should not throw when accessing the error
      expect(error.context?.circular?.name).toBe("circular");
      expect(error.context?.circular?.self).toBe(circularObj);
    });
  });

  describe("error message formatting", () => {
    test("should format error messages consistently", () => {
      const testCases = [
        {
          type: ErrorType.CONFIG_NOT_FOUND,
          message: "Configuration file not found: /path/to/config.yaml",
          expectedPattern: /Configuration file not found:/,
        },
        {
          type: ErrorType.YAML_PARSE_ERROR,
          message: "Failed to parse YAML configuration: Unexpected token",
          expectedPattern: /Failed to parse YAML configuration:/,
        },
        {
          type: ErrorType.PATH_INVALID,
          message:
            "Failed to calculate local path for docset 'react-docs': Path resolution error",
          expectedPattern: /Failed to calculate local path for docset/,
        },
      ];

      testCases.forEach(({ type, message, expectedPattern }) => {
        const error = new KnowledgeError(type, message);
        expect(error.message).toMatch(expectedPattern);
      });
    });
  });
});
