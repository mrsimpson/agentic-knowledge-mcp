/**
 * Template processing functionality
 */

import type { TemplateContext, DocsetConfig } from '../types.js';
import { 
  KnowledgeError, 
  ErrorType, 
  DEFAULT_TEMPLATE, 
  ALLOWED_TEMPLATE_VARIABLES,
  REQUIRED_TEMPLATE_VARIABLES 
} from '../types.js';

/**
 * Process a template with variable substitution
 * @param template - Template string with variables
 * @param context - Context data for substitution
 * @returns Processed template string
 */
export function processTemplate(template: string, context: TemplateContext): string {
  try {
    let processed = template;
    
    // Replace template variables using double curly brace syntax
    const variables: Record<string, string> = {
      local_path: context.local_path,
      keywords: context.keywords,
      generalized_keywords: context.generalized_keywords,
      docset_id: context.docset.id,
      docset_name: context.docset.name,
      docset_description: context.docset.description || ''
    };
    
    // Replace each variable
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      processed = processed.replace(regex, value);
    }
    
    // Check for unreplaced variables - this should never happen in production
    // because templates are validated at startup
    const unreplacedMatches = processed.match(/\{\{[^}]+\}\}/g);
    if (unreplacedMatches) {
      throw new KnowledgeError(
        ErrorType.TEMPLATE_ERROR,
        `Template contains invalid variables: ${unreplacedMatches.join(', ')}`,
        { template, unreplacedMatches }
      );
    }
    
    return processed.trim();
  } catch (error) {
    if (error instanceof KnowledgeError) {
      throw error;
    }
    throw new KnowledgeError(
      ErrorType.TEMPLATE_ERROR,
      `Failed to process template: ${(error as Error).message}`,
      { template, context, error }
    );
  }
}

/**
 * Get the effective template for a docset (docset template or global template or default)
 * @param docset - Docset configuration
 * @param globalTemplate - Global template from config (optional)
 * @returns Template string to use
 */
export function getEffectiveTemplate(docset: DocsetConfig, globalTemplate?: string): string {
  // Priority: docset template > global template > default template
  return docset.template || globalTemplate || DEFAULT_TEMPLATE;
}

/**
 * Validate that a template contains only allowed variables and has required variables
 * This should be called during configuration loading to fail fast on invalid templates
 * @param template - Template string to validate
 * @returns True if template is valid, throws KnowledgeError if invalid
 */
export function validateTemplateStrict(template: string): boolean {
  // Extract all variables from template
  const variables = extractVariables(template);
  
  // Check for invalid variables
  const invalidVariables = variables.filter(
    variable => !ALLOWED_TEMPLATE_VARIABLES.includes(variable as any)
  );
  
  if (invalidVariables.length > 0) {
    throw new KnowledgeError(
      ErrorType.TEMPLATE_ERROR,
      `Template contains invalid variables: ${invalidVariables.join(', ')}. Allowed variables: ${ALLOWED_TEMPLATE_VARIABLES.join(', ')}`,
      { template, invalidVariables, allowedVariables: ALLOWED_TEMPLATE_VARIABLES }
    );
  }
  
  // Check for required variables
  const missingRequired = REQUIRED_TEMPLATE_VARIABLES.filter(
    required => !variables.includes(required)
  );
  
  if (missingRequired.length > 0) {
    throw new KnowledgeError(
      ErrorType.TEMPLATE_ERROR,
      `Template missing required variables: ${missingRequired.join(', ')}. Required variables: ${REQUIRED_TEMPLATE_VARIABLES.join(', ')}`,
      { template, missingRequired, requiredVariables: REQUIRED_TEMPLATE_VARIABLES }
    );
  }
  
  return true;
}

/**
 * Validate that a template contains required variables (legacy function for backward compatibility)
 * @param template - Template string to validate
 * @param requiredVars - Array of required variable names
 * @returns True if all required variables are present
 */
export function validateTemplate(template: string, requiredVars: string[] = ['local_path', 'keywords']): boolean {
  for (const varName of requiredVars) {
    const regex = new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`);
    if (!regex.test(template)) {
      return false;
    }
  }
  return true;
}

/**
 * Extract variable names from a template
 * @param template - Template string
 * @returns Array of variable names found in the template
 */
export function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{\s*([^}]+)\s*\}\}/g);
  if (!matches) return [];
  
  return matches.map(match => {
    const varName = match.replace(/\{\{\s*/, '').replace(/\s*\}\}/, '');
    return varName.trim();
  });
}

/**
 * Create template context from search parameters
 * @param localPath - Calculated local path
 * @param keywords - Search keywords
 * @param generalizedKeywords - Generalized keywords
 * @param docset - Docset configuration
 * @returns Template context object
 */
export function createTemplateContext(
  localPath: string,
  keywords: string,
  generalizedKeywords: string,
  docset: DocsetConfig
): TemplateContext {
  return {
    local_path: localPath,
    keywords,
    generalized_keywords: generalizedKeywords,
    docset
  };
}