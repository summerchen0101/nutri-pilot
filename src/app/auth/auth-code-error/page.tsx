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
            className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-shadow-grey px-[18px] py-[11px] text-body font-medium text-white shadow-none transition-colors duration-150 ease-out hover:bg-shadow-grey-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            返回登入
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
