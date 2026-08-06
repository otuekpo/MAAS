import * as path from "path";
import * as fs from "fs";
import Handlebars from "handlebars";

function resolveTemplateDir(): string {
  const sourceDir = path.join(__dirname, "../EmailTemplate");
  if (fs.existsSync(sourceDir)) return sourceDir;
  const distDir = path.join(
    process.cwd(),
    "dist",
    "libs",
    "shared",
    "EmailTemplate",
  );
  if (fs.existsSync(distDir)) return distDir;
  return sourceDir;
}

/**
 * Get email template.
 * @param fileName the filename.
 * @returns raw email template.
 */
export function getRawEmailTemplate(fileName: string) {
  return path.join(resolveTemplateDir(), fileName);
}

/**
 * Insert content into a template.
 * @param emailTemplate the raw template.
 * @param templateVariables the variables to insert into it.
 * @returns email with the right content.
 */
export function insertContentIntoEmail(
  emailTemplate: string,
  templateVariables: Record<string, any>,
) {
  const compiledTemplate = Handlebars.compile(
    fs.readFileSync(emailTemplate, "utf8"),
  );

  return compiledTemplate({
    ...templateVariables,
    contactEmail: process.env.CONTACT_EMAIL,
  });
}

export function prepareHTML(
  fileName: string,
  templateVariables: Record<string, any>,
) {
  const template = getRawEmailTemplate(fileName);
  return insertContentIntoEmail(template, templateVariables);
}
