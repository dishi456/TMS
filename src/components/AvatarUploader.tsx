"use client";

import { useRouter } from "next/navigation";
import { ImageUploader, type Uploaded } from "@/components/ImageUploader";
import { setOwnAvatar } from "@/app/actions/account";

// Profile photo: shows the current avatar (or an initial) and uploads a new one,
// persisting the resulting URL onto the user via setOwnAvatar.
export function AvatarUploader({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const router = useRouter();

  async function onUploaded(u: Uploaded) {
    await setOwnAvatar(u.url);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover ring-1 ring-slate-200" />
      ) : (
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-blue-700">{name.charAt(0).toUpperCase()}</span>
      )}
      <div className="flex-1">
        <ImageUploader purpose="avatar" accept="image/*" buttonLabel="Upload photo" onUploaded={onUploaded} />
      </div>
    </div>
  );
}
