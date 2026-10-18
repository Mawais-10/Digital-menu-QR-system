import { useState } from 'react';
import { Card, CardHeader, Button, Input, PageHeader } from '../../components/ui.jsx';
import { PasswordField } from '../../components/CredentialFields.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { authApi } from '../../api/endpoints.js';
import { errMsg } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { passwordChecks, allOk } from '../../lib/credentials.js';

export default function Settings() {
  const { user, setUser } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState({ businessName: user?.businessName || '', phone: user?.phone || '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await authApi.updateProfile(profile);
      setUser(data.user);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (!allOk(passwordChecks(pw.newPassword, user?.username))) {
      toast.error('The new password does not meet all the rules yet');
      return;
    }
    if (pw.newPassword !== pw.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    setSavingPw(true);
    try {
      const { data } = await authApi.changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setUser(data.user);
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password changed');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div>
      <PageHeader title="Account settings" subtitle="Your brand manager profile." />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Profile" description="Used across your dashboard." />
          <form onSubmit={saveProfile} className="space-y-4 p-5">
            <Input label="Username" value={user?.username || ''} disabled className="font-mono" hint="You sign in with this username. It cannot be changed here." />
            <Input label="Business name" required value={profile.businessName} onChange={(e) => setProfile({ ...profile, businessName: e.target.value })} />
            <Input label="Phone" type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            <div className="flex justify-end border-t border-gray-100 pt-4">
              <Button type="submit" loading={savingProfile}>Save profile</Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Change password" description="Choose one nobody else could guess." />
          <form onSubmit={savePassword} className="space-y-4 p-5">
            <PasswordField
              label="Current password"
              required
              rules={false}
              autoComplete="current-password"
              value={pw.currentPassword}
              onChange={(v) => setPw({ ...pw, currentPassword: v })}
            />
            <PasswordField
              label="New password"
              required
              username={user?.username}
              value={pw.newPassword}
              onChange={(v) => setPw({ ...pw, newPassword: v })}
            />
            <PasswordField
              label="Repeat new password"
              required
              rules={false}
              value={pw.confirm}
              onChange={(v) => setPw({ ...pw, confirm: v })}
              error={pw.confirm && pw.confirm !== pw.newPassword ? 'Does not match the new password' : undefined}
            />
            <div className="flex justify-end border-t border-gray-100 pt-4">
              <Button type="submit" loading={savingPw}>Update password</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
