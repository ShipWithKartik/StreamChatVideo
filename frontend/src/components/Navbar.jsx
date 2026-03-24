import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import {
  BellIcon,
  CameraIcon,
  ImageUpIcon,
  LogOutIcon,
  ShipWheelIcon,
  ShuffleIcon,
  UserIcon,
  XIcon,
  LoaderIcon,
} from "lucide-react";
import ThemeSelector from "./ThemeSelector";
import useLogout from "../hooks/useLogout";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadAvatar, completeOnboarding } from "../lib/api";
import { getProfilePicUrl } from "../lib/utils";
import toast from "react-hot-toast";

const Navbar = () => {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const isChatPage = location.pathname?.startsWith("/chat");
  const queryClient = useQueryClient();

  const { logoutMutation } = useLogout();

  // Avatar dropdown state
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);

  // Upload mutation
  const { mutate: uploadMutation, isPending: isUploading } = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: () => {
      toast.success("Profile picture updated!");
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      closeMenu();
    },
    onError: () => {
      toast.error("Failed to upload profile picture");
    },
  });

  // Random avatar mutation (uses onboarding endpoint to save just the profilePic URL)
  const { mutate: randomAvatarMutation, isPending: isRandomizing } = useMutation({
    mutationFn: async () => {
      const idx = Math.floor(Math.random() * 100) + 1;
      const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`;
      return completeOnboarding({
        fullName: authUser.fullName,
        bio: authUser.bio,
        nativeLanguage: authUser.nativeLanguage,
        learningLanguage: authUser.learningLanguage,
        location: authUser.location,
        profilePic: randomAvatar,
      });
    },
    onSuccess: () => {
      toast.success("Random avatar applied!");
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      closeMenu();
    },
    onError: () => {
      toast.error("Failed to update avatar");
    },
  });

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closeMenu();
      }
    };
    if (showAvatarMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAvatarMenu]);

  const closeMenu = () => {
    setShowAvatarMenu(false);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result);
    reader.readAsDataURL(file);
  };

  const handleConfirmUpload = () => {
    if (selectedFile) {
      uploadMutation(selectedFile);
    }
  };

  const isWorking = isUploading || isRandomizing;

  return (
    <nav className="bg-base-200 border-b border-base-300 sticky top-0 z-30 h-16 flex items-center">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-end w-full">
          {/* LOGO - ONLY IN THE CHAT PAGE */}
          {isChatPage && (
            <div className="pl-5">
              <Link to="/" className="flex items-center gap-2.5">
                <ShipWheelIcon className="size-9 text-primary" />
                <span className="text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary  tracking-wider">
                  Streamify
                </span>
              </Link>
            </div>
          )}

          <div className="flex items-center gap-3 sm:gap-4 ml-auto">
            <Link to={"/notifications"}>
              <button className="btn btn-ghost btn-circle">
                <BellIcon className="h-6 w-6 text-base-content opacity-70" />
              </button>
            </Link>
          </div>

          {/* Theme selector */}
          <ThemeSelector />

          {/* AVATAR — Clickable with dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              className="avatar cursor-pointer"
              onClick={() => setShowAvatarMenu(!showAvatarMenu)}
            >
              <div className="w-9 rounded-full ring ring-primary ring-offset-base-100 ring-offset-1 hover:ring-secondary transition-all">
                <img src={getProfilePicUrl(authUser)} alt="User Avatar" referrerPolicy="no-referrer" />
              </div>
            </button>

            {/* DROPDOWN MENU */}
            {showAvatarMenu && (
              <div className="absolute right-0 top-12 w-72 bg-base-200 border border-base-300 rounded-xl shadow-xl z-50 p-4 space-y-3">
                {/* View Profile Link */}
                <Link
                  to={`/profile/${authUser?._id}`}
                  onClick={closeMenu}
                  className="btn btn-ghost btn-sm w-full justify-start gap-2"
                >
                  <UserIcon className="size-4" />
                  View Profile
                </Link>

                <div className="divider my-0" />

                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Change Profile Picture</h3>
                  <button onClick={closeMenu} className="btn btn-ghost btn-xs btn-circle">
                    <XIcon className="size-3" />
                  </button>
                </div>

                {/* Current / Preview avatar */}
                <div className="flex justify-center">
                  <div className="size-20 rounded-full bg-base-300 overflow-hidden">
                    <img
                      src={previewUrl || getProfilePicUrl(authUser)}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* File input (hidden) */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />

                {/* Buttons */}
                <div className="space-y-2">
                  {!selectedFile ? (
                    <>
                      <button
                        className="btn btn-outline btn-sm w-full"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isWorking}
                      >
                        <ImageUpIcon className="size-4 mr-1" />
                        Upload New Photo
                      </button>
                      <button
                        className="btn btn-accent btn-sm w-full"
                        onClick={() => randomAvatarMutation()}
                        disabled={isWorking}
                      >
                        {isRandomizing ? (
                          <LoaderIcon className="size-4 mr-1 animate-spin" />
                        ) : (
                          <ShuffleIcon className="size-4 mr-1" />
                        )}
                        Random Avatar
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-center text-base-content/70 truncate">
                        {selectedFile.name}
                      </p>
                      <button
                        className="btn btn-primary btn-sm w-full"
                        onClick={handleConfirmUpload}
                        disabled={isWorking}
                      >
                        {isUploading ? (
                          <>
                            <LoaderIcon className="size-4 mr-1 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <CameraIcon className="size-4 mr-1" />
                            Confirm Upload
                          </>
                        )}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm w-full"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                        }}
                        disabled={isWorking}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Logout button */}
          <button className="btn btn-ghost btn-circle" onClick={logoutMutation}>
            <LogOutIcon className="h-6 w-6 text-base-content opacity-70" />
          </button>
        </div>
      </div>
    </nav>
  );
};
export default Navbar;
