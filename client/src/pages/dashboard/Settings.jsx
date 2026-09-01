import { useState } from 'react';
import { Card, Button, Input, PageHeader } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { authApi } from '../../api/endpoints.js';
import { errMsg } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function Settings() {
  const { user, setUser } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState({ businessName: user?.businessName || '', phone: user?.phone || '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // RESTORE: change-password state (uncomment along with the card below)
  // const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  // const [savingPw, setSavingPw] = useState(false);

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

  /* RESTORE: change-password handler (uncomment along with the card below)
  const savePassword = async (e) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    setSavingPw(true);
    try {
      await authApi.changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password changed');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSavingPw(false);
    }
  };
  */

  return (
    <div className="animate-fade-in">
      <PageHeader title="Account Settings" subtitle="Your profile and security" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-base font-bold text-gray-900">Profile</h2>
          <form onSubmit={saveProfile} className="space-y-4">
            <Input label="Email" value={user?.email || ''} disabled className="!bg-gray-50 text-gray-400" />
            <Input label="Business name" required value={profile.businessName} onChange={(e) => setProfile({ ...profile, businessName: e.target.value })} />
            <Input label="Phone" type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            <div className="flex justify-end">
              <Button type="submit" loading={savingProfile}>Save profile</Button>
            </div>
          </form>
        </Card>

        {/* RESTORE: change-password card (also uncomment the pw state + savePassword handler above)
        <Card className="p-6">
          <h2 className="mb-4 text-base font-bold text-gray-900">Change password</h2>
          <form onSubmit={savePassword} className="space-y-4">
            <Input label="Current password" type="password" required autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
            <Input label="New password" type="password" required autoComplete="new-password" hint="Minimum 8 characters" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
            <Input label="Confirm new password" type="password" required autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            <div className="flex justify-end">
              <Button type="submit" loading={savingPw}>Update password</Button>
            </div>
          </form>
        </Card>
        */}
      </div>
    </div>
  );
}
