import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUserFriends,
  getFriendRequests,
  acceptFriendRequest,
} from "../lib/api";
import { Link } from "react-router";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  MessageSquareIcon,
  SearchIcon,
  UserCheckIcon,
  UsersIcon,
} from "lucide-react";
import { capitialize, getProfilePicUrl } from "../lib/utils";
import { getLanguageFlag } from "../components/FriendCard";

const FriendsPage = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showRequests, setShowRequests] = useState(true);

  // Fetch friends
  const { data: friends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  // Fetch friend requests
  const { data: friendRequests, isLoading: loadingRequests } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
  });

  const { mutate: acceptRequestMutation, isPending: isAccepting } = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  const incomingRequests = friendRequests?.incomingReqs || [];

  // Client-side filter
  const filteredFriends = friends.filter((friend) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      friend.fullName?.toLowerCase().includes(q) ||
      friend.nativeLanguage?.toLowerCase().includes(q) ||
      friend.learningLanguage?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Friends</h1>

        {/* FRIEND REQUESTS SECTION */}
        {incomingRequests.length > 0 && (
          <div className="card bg-base-200">
            <div className="card-body p-4">
              <button
                className="flex items-center justify-between w-full"
                onClick={() => setShowRequests(!showRequests)}
              >
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <UserCheckIcon className="size-5 text-primary" />
                  Friend Requests
                  <span className="badge badge-primary badge-sm">{incomingRequests.length}</span>
                </h2>
                {showRequests ? (
                  <ChevronUpIcon className="size-5 opacity-70" />
                ) : (
                  <ChevronDownIcon className="size-5 opacity-70" />
                )}
              </button>

              {showRequests && (
                <div className="space-y-3 mt-3">
                  {incomingRequests.map((request) => (
                    <div
                      key={request._id}
                      className="flex items-center justify-between bg-base-100 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/profile/${request.sender._id}`}
                          className="avatar w-12 h-12 rounded-full"
                        >
                          <img
                            src={getProfilePicUrl(request.sender)}
                            alt={request.sender.fullName}
                          />
                        </Link>
                        <div>
                          <Link
                            to={`/profile/${request.sender._id}`}
                            className="font-semibold hover:underline"
                          >
                            {request.sender.fullName}
                          </Link>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            <span className="badge badge-secondary badge-xs">
                              Native: {request.sender.nativeLanguage}
                            </span>
                            <span className="badge badge-outline badge-xs">
                              Learning: {request.sender.learningLanguage}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => acceptRequestMutation(request._id)}
                        disabled={isAccepting}
                      >
                        Accept
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SEARCH BAR */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-50" />
          <input
            type="text"
            placeholder="Search friends by name or language..."
            className="input input-bordered w-full pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* FRIENDS GRID */}
        {loadingFriends ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : friends.length === 0 ? (
          <div className="card bg-base-200 p-8 text-center">
            <UsersIcon className="size-12 mx-auto mb-3 opacity-30" />
            <h3 className="font-semibold text-lg mb-2">No friends yet</h3>
            <p className="text-base-content opacity-70 mb-4">
              Head to Home to find people to connect with!
            </p>
            <Link to="/" className="btn btn-primary btn-sm mx-auto w-fit">
              Find Learners
            </Link>
          </div>
        ) : filteredFriends.length === 0 ? (
          <div className="card bg-base-200 p-6 text-center">
            <p className="opacity-70">No friends match "{searchQuery}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFriends.map((friend) => (
              <div
                key={friend._id}
                className="card bg-base-200 hover:shadow-md transition-shadow"
              >
                <div className="card-body p-4">
                  {/* Avatar + Name */}
                  <div className="flex items-center gap-3 mb-3">
                    <Link to={`/profile/${friend._id}`} className="avatar size-12 rounded-full">
                      <img src={getProfilePicUrl(friend)} alt={friend.fullName} />
                    </Link>
                    <Link
                      to={`/profile/${friend._id}`}
                      className="font-semibold truncate hover:underline"
                    >
                      {friend.fullName}
                    </Link>
                  </div>

                  {/* Language badges */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="badge badge-secondary text-xs">
                      {getLanguageFlag(friend.nativeLanguage)}
                      Native: {capitialize(friend.nativeLanguage)}
                    </span>
                    <span className="badge badge-outline text-xs">
                      {getLanguageFlag(friend.learningLanguage)}
                      Learning: {capitialize(friend.learningLanguage)}
                    </span>
                  </div>

                  {/* Message button */}
                  <Link to={`/chat/${friend._id}`} className="btn btn-outline btn-sm w-full">
                    <MessageSquareIcon className="size-4 mr-1" />
                    Message
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsPage;
