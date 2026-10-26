export const SITE = {
  name: "Nextdemy",
  author: "Amjad",
  githubUrl: "https://github.com/AmjadIbrahim1/nextdemy",
  githubProfileUrl: "https://github.com/AmjadIbrahim1",
  contactEmail:
    process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@nextdemy.app",
} as const;
