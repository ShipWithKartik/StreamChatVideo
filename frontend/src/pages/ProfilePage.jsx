import { useState } from "react";
import { useParams, Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUserProfile,
  updateProfile,
  sendFriendRequest,
  getOutgoingFriendReqs,
} from "../lib/api";
import useAuthUser from "../hooks/useAuthUser";
import { getProfilePicUrl, capitialize } from "../lib/utils";
import { LANGUAGE_TO_FLAG } from "../constants";
import toast from "react-hot-toast";

import {
  CalendarIcon,
  EditIcon,
  LoaderIcon,
  MapPinIcon,
  MessageSquareIcon,
  UserPlusIcon,
  UsersIcon,
  CheckCircleIcon,
  XIcon,
} from "lucide-react";

const LanguageFlag = ({ language, size = "h-4" }) => {
  if (!language) return null;
  const langLower = language.toLowerCase();
  const countryCode = LANGUAGE_TO_FLAG[langLower];
  if (!countryCode) return null;
  return (
    <img
      src={`https://flagcdn.com/24x18/${countryCode}.png`}
      alt={`${langLower} flag`}
      className={`${size} inline-block mr-1`}
    />
  );
};

const ProfilePage = () => {
  const { userId } = useParams();
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const isOwnProfile = authUser?._id === userId;

  const [showEditModal, setShowEditModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: () => getUserProfile(userId),
    enabled: !!userId,
  });

  const { data: outgoingReqs } = useQuery({
    queryKey: ["outgoingFriendReqs"],
    queryFn: getOutgoingFriendReqs,
    enabled: !isOwnProfile,
  });

  const { mutate: sendRequestMutation, isPending: isSending } = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] });
      toast.success("Friend request sent!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to send request");
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <p className="text-lg opacity-70">User not found</p>
      </div>
    );
  }

  const { user: profileUser, mutualFriends = [] } = data;

  // Determine friendship status
  const isFriend = authUser?.friends?.some(
    (id) => id === profileUser._id || id.toString?.() === profileUser._id
  );
  const hasPendingRequest = outgoingReqs?.some(
    (req) => req.recipient._id === profileUser._id
  );

  const joinDate = new Date(profileUser.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-4xl space-y-8">
        {/* HEADER SECTION */}
        <div className="card bg-base-200">
          <div className="card-body p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar */}
              <div className="avatar">
                <div className="w-28 h-28 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                  <img src={getProfilePicUrl(profileUser)} alt={profileUser.fullName} />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold">{profileUser.fullName}</h1>

                {(profileUser.country || profileUser.location) && (
                  <div className="flex items-center justify-center sm:justify-start gap-1 mt-1 opacity-70">
                    <MapPinIcon className="size-4" />
                    <span className="text-sm">
                      {profileUser.country || profileUser.location}
                    </span>
                  </div>
                )}

                {/* Stats Row */}
                <div className="flex items-center justify-center sm:justify-start gap-4 mt-3">
                  <div className="flex items-center gap-1 text-sm opacity-70">
                    <UsersIcon className="size-4" />
                    <span className="font-medium">{profileUser.friendCount}</span> friends
                  </div>
                  <div className="flex items-center gap-1 text-sm opacity-70">
                    <CalendarIcon className="size-4" />
                    Member since {joinDate}
                  </div>
                </div>
              </div>

              {/* Action button */}
              <div className="flex-shrink-0">
                {isOwnProfile ? (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setShowEditModal(true)}
                  >
                    <EditIcon className="size-4 mr-1" />
                    Edit Profile
                  </button>
                ) : isFriend ? (
                  <Link to={`/chat/${profileUser._id}`} className="btn btn-primary btn-sm">
                    <MessageSquareIcon className="size-4 mr-1" />
                    Message
                  </Link>
                ) : hasPendingRequest ? (
                  <button className="btn btn-disabled btn-sm" disabled>
                    <CheckCircleIcon className="size-4 mr-1" />
                    Request Sent
                  </button>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => sendRequestMutation(profileUser._id)}
                    disabled={isSending}
                  >
                    <UserPlusIcon className="size-4 mr-1" />
                    Add Friend
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* LANGUAGE SECTION */}
        <div className="card bg-base-200">
          <div className="card-body p-6">
            <h2 className="text-lg font-semibold mb-3">Languages</h2>
            <div className="flex flex-wrap gap-3">
              {profileUser.nativeLanguage && (
                <div className="badge badge-secondary badge-lg gap-1 py-3">
                  <LanguageFlag language={profileUser.nativeLanguage} />
                  Native: {capitialize(profileUser.nativeLanguage)}
                </div>
              )}
              {profileUser.learningLanguage && (
                <div className="badge badge-outline badge-lg gap-1 py-3">
                  <LanguageFlag language={profileUser.learningLanguage} />
                  Learning: {capitialize(profileUser.learningLanguage)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BIO SECTION */}
        <div className="card bg-base-200">
          <div className="card-body p-6">
            <h2 className="text-lg font-semibold mb-2">About</h2>
            {profileUser.bio ? (
              <p className="text-sm opacity-80 leading-relaxed">{profileUser.bio}</p>
            ) : isOwnProfile ? (
              <p className="text-sm opacity-50 italic">
                Add a bio to tell people about yourself
              </p>
            ) : (
              <p className="text-sm opacity-50 italic">No bio yet</p>
            )}
          </div>
        </div>

        {/* MUTUAL FRIENDS — only on other people's profiles */}
        {!isOwnProfile && mutualFriends.length > 0 && (
          <div className="card bg-base-200">
            <div className="card-body p-6">
              <h2 className="text-lg font-semibold mb-3">
                Mutual Friends ({mutualFriends.length})
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {mutualFriends.slice(0, 6).map((friend) => (
                  <Link
                    key={friend._id}
                    to={`/profile/${friend._id}`}
                    className="tooltip"
                    data-tip={friend.fullName}
                  >
                    <div className="avatar">
                      <div className="w-10 rounded-full ring ring-base-300 ring-offset-base-100 ring-offset-1 hover:ring-primary transition-all">
                        <img src={getProfilePicUrl(friend)} alt={friend.fullName} />
                      </div>
                    </div>
                  </Link>
                ))}
                {mutualFriends.length > 6 && (
                  <span className="text-sm opacity-70 ml-1">
                    +{mutualFriends.length - 6} more
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FRIENDS PREVIEW — only on own profile */}
        {isOwnProfile && authUser?.friends?.length > 0 && (
          <div className="card bg-base-200">
            <div className="card-body p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">
                  Your Friends ({profileUser.friendCount})
                </h2>
              </div>
              <FriendsPreview friendIds={authUser.friends} />
            </div>
          </div>
        )}
      </div>

      {/* EDIT PROFILE MODAL */}
      {showEditModal && (
        <EditProfileModal
          currentBio={profileUser.bio}
          currentCountry={profileUser.country}
          onClose={() => setShowEditModal(false)}
          userId={userId}
        />
      )}
    </div>
  );
};

/* ─── Friends Preview (own profile) ─── */
const FriendsPreview = ({ friendIds }) => {
  const { data: friends = [], isLoading } = useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const { getUserFriends } = await import("../lib/api");
      return getUserFriends();
    },
  });

  if (isLoading) {
    return <span className="loading loading-spinner loading-sm" />;
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
      {friends.slice(0, 6).map((friend) => (
        <Link
          key={friend._id}
          to={`/profile/${friend._id}`}
          className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
        >
          <div className="avatar">
            <div className="w-12 rounded-full">
              <img src={getProfilePicUrl(friend)} alt={friend.fullName} />
            </div>
          </div>
          <span className="text-xs truncate w-full text-center">{friend.fullName}</span>
        </Link>
      ))}
    </div>
  );
};

/* ─── Edit Profile Modal ─── */
const EditProfileModal = ({ currentBio, currentCountry, onClose, userId }) => {
  const queryClient = useQueryClient();
  const [bio, setBio] = useState(currentBio || "");
  const [country, setCountry] = useState(currentCountry || "");

  const { mutate: updateMutation, isPending } = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      toast.success("Profile updated!");
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update profile");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation({ bio, country });
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Edit Profile</h3>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose}>
            <XIcon className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Bio */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Bio</span>
              <span className={`label-text-alt ${bio.length > 200 ? "text-error" : ""}`}>
                {bio.length}/200
              </span>
            </label>
            <textarea
              className="textarea textarea-bordered h-24"
              placeholder="Tell people about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Country */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Country</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              placeholder="e.g. United States"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>

          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isPending || bio.length > 200}
            >
              {isPending ? (
                <>
                  <LoaderIcon className="size-4 animate-spin mr-1" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
};

export default ProfilePage;
