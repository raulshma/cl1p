'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

export default function DemoPage() {
  return (
    <main className="min-h-screen p-8 bg-background text-foreground">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">
            Tailwind CSS 4 & shadcn/ui Demo
          </h1>
          <p className="text-lg text-muted-foreground">
            Material Design 3 Theme Tokens
          </p>
        </div>

        {/* Button Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Button Components</CardTitle>
            <CardDescription>
              showcasing different button variants with Material Design 3 tokens
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button variant="default">Default Button</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </CardContent>
        </Card>

        {/* Button Sizes */}
        <Card>
          <CardHeader>
            <CardTitle>Button Sizes</CardTitle>
            <CardDescription>
              Different button sizes for various use cases
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
          </CardContent>
        </Card>

        {/* Theme Colors Card */}
        <Card>
          <CardHeader>
            <CardTitle>Theme Tokens</CardTitle>
            <CardDescription>
              Material Design 3 color palette is configured and working
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-primary text-primary-foreground rounded-md">
                Primary
              </div>
              <div className="p-4 bg-secondary text-secondary-foreground rounded-md">
                Secondary
              </div>
              <div className="p-4 bg-muted text-muted-foreground rounded-md">
                Muted
              </div>
              <div className="p-4 bg-accent text-accent-foreground rounded-md">
                Accent
              </div>
              <div className="p-4 bg-destructive text-destructive-foreground rounded-md">
                Destructive
              </div>
              <div className="p-4 border-2 border-border rounded-md">
                Border
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">
              All colors use CSS variables with HSL values for easy theming
            </p>
          </CardFooter>
        </Card>

        {/* Setup Info */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Complete!</CardTitle>
            <CardDescription>
              Your project is now configured with:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Tailwind CSS 4 with @tailwindcss/postcss</li>
              <li>shadcn/ui component library configuration</li>
              <li>Material Design 3 theme tokens (light & dark)</li>
              <li>Reusable UI components (Button, Card)</li>
              <li>cn() utility function for className merging</li>
            </ul>
          </CardContent>
          <CardFooter className="flex justify-between">
            <p className="text-xs text-muted-foreground">
              Use components from src/components/ui in your app
            </p>
            <Button variant="outline" size="sm">
              View Docs
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
