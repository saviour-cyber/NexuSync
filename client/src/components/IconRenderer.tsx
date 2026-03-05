import { memo } from "react";
import * as LucideIcons from "lucide-react";
import { LucideProps } from "lucide-react";

interface IconRendererProps extends LucideProps {
  name: string;
}

export const IconRenderer = memo(({ name, ...props }: IconRendererProps) => {
  // @ts-ignore - Indexing into lucide icons dynamically
  const IconComponent = LucideIcons[name];

  if (!IconComponent) {
    return <LucideIcons.Monitor {...props} />;
  }

  return <IconComponent {...props} />;
});

IconRenderer.displayName = "IconRenderer";
