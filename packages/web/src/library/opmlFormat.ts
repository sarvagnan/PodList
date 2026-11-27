export const invalidOpml = () =>
  new Error("This file is not valid OPML. Export an OPML file from your other podcast app.")

export const checkOpml = (xml: string) => {
  if (new TextEncoder().encode(xml).length > 8 * 1024 * 1024)
    throw new Error("Choose an OPML file under 8 MiB.")
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error("OPML files cannot contain DTDs or entities.")
}
