import { Logo } from "@/components/app/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="mb-10 mt-4 flex justify-center">
        <Logo size={64} />
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </main>
  );
}
