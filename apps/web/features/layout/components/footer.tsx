import { SITE } from "@/data/site";

export default function Footer() {
  return (
    <footer className="border-border/50 border-t bg-background/95">
      <div className="container flex h-16 items-center justify-center text-balance">
        <p className="text-center text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} {SITE.name}. All rights reserved.
          Built by{" "}
          <a
            className="font-medium text-primary underline-offset-4 hover:underline"
            href={SITE.githubProfileUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {SITE.author}
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
