export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-lg px-4">{children}</div>
    </div>
  );
}
