export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-full p-4 flex items-start justify-center">
      {children}
    </div>
  );
} 