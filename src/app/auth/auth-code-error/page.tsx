import Link from 'next/link';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>無法完成登入</CardTitle>
          <CardDescription>
            連結可能已過期或已使用。請返回登入頁重新索取驗證信。
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-end border-t border-slate-100 pt-6">
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
          >
            返回登入
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
