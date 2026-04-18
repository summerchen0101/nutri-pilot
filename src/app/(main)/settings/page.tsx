import { SignOutButton } from '@/components/auth/sign-out-button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">設定</h1>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">帳號</CardTitle>
            <CardDescription>結束目前工作階段並返回登入頁。</CardDescription>
          </div>
          <SignOutButton />
        </CardHeader>
      </Card>
    </div>
  );
}
