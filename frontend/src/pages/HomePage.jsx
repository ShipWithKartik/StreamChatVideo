import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  getOutgoingFriendReqs,
  getRecommendedUsers,
  getUserFriends,
  sendFriendRequest,
  searchUsers,
} from "../lib/api";
import { Link } from "react-router";
import {
  CheckCircleIcon,
  MapPinIcon,
  MessageSquareIcon,
  SearchIcon,
  UserPlusIcon,
  XCircleIcon,
} from "lucide-react";

import { capitialize, getProfilePicUrl } from "../lib/utils";
import { LANGUAGES } from "../constants";
import { getLanguageFlag } from "../components/FriendCard";
import useAuthUser from "../hooks/useAuthUser";

const HomePage = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const [outgoingRequestsIds, setOutgoingRequestsIds] = useState(new Set());
  const [friendIds, setFriendIds] = useState(new Set());

  // Search form state
  const [searchName, setSearchName] = useState("");
  const [searchNative, setSearchNative] = useState("");
  const [searchLearning, setSearchLearning] = useState("");
  const [searchCountry, setSearchCountry] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [searchParams, setSearchParams] = useState(null);

  // Default recommendations
  const { data: recommendedUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: getRecommendedUsers,
  });

  // Search results
  const { data: searchResults = [], isLoading: loadingSearch } = useQuery({
    queryKey: ["searchUsers", searchParams],
    queryFn: () => searchUsers(searchParams),
    enabled: !!searchParams,
  });

  // Outgoing friend requests
  const { data: outgoingFriendReqs } = useQuery({
    queryKey: ["outgoingFriendReqs"],
    queryFn: getOutgoingFriendReqs,
  });

  // Friends list (for determining friend status)
  const { data: friends = [] } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  const { mutate: sendRequestMutation, isPending } = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] }),
  });

  useEffect(() => {
    const outgoingIds = new Set();
    if (outgoingFriendReqs && outgoingFriendReqs.length > 0) {
      outgoingFriendReqs.forEach((req) => {
        outgoingIds.add(req.recipient._id);
      });
    }
    setOutgoingRequestsIds(outgoingIds);
  }, [outgoingFriendReqs]);

  useEffect(() => {
    const ids = new Set();
    friends.forEach((f) => ids.add(f._id));
    setFriendIds(ids);
  }, [friends]);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = {};
    if (searchName.trim()) params.name = searchName.trim();
    if (searchNative) params.nativeLanguage = searchNative;
    if (searchLearning) params.learningLanguage = searchLearning;
    if (searchCountry.trim()) params.country = searchCountry.trim();

    if (Object.keys(params).length === 0) return;

    setSearchParams(params);
    setHasSearched(true);
  };

  const handleClear = () => {
    setSearchName("");
    setSearchNative("");
    setSearchLearning("");
    setSearchCountry("");
    setSearchParams(null);
    setHasSearched(false);
  };

  // Decide which users to display
  const displayUsers = hasSearched ? searchResults : recommendedUsers;
  const isLoadingDisplay = hasSearched ? loadingSearch : loadingUsers;

  const getActionButton = (user) => {
    // Don't show any action for own profile
    if (user._id === authUser?._id) return null;

    const isFriend = friendIds.has(user._id);
    const hasPending = outgoingRequestsIds.has(user._id);

    if (isFriend) {
      return (
        <Link to={`/chat/${user._id}`} className="btn btn-outline w-full mt-2">
          <MessageSquareIcon className="size-4 mr-2" />
          Message
        </Link>
      );
    }

    if (hasPending) {
      return (
        <button className="btn btn-disabled w-full mt-2" disabled>
          <CheckCircleIcon className="size-4 mr-2" />
          Request Sent
        </button>
      );
    }

    return (
      <button
        className="btn btn-primary w-full mt-2"
        onClick={() => sendRequestMutation(user._id)}
        disabled={isPending}
      >
        <UserPlusIcon className="size-4 mr-2" />
        Send Friend Request
      </button>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Find Language Partners</h2>
          <p className="opacity-70 mt-1">Search for users by name, language, or country</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="card bg-base-200 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Name */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">Name</span>
              </label>
              <input
                type="text"
                placeholder="Search by name..."
                className="input input-bordered input-sm"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>

            {/* Native Language */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">Native Language</span>
              </label>
              <select
                className="select select-bordered select-sm"
                value={searchNative}
                onChange={(e) => setSearchNative(e.target.value)}
              >
                <option value="">Any</option>
                {LANGUAGES.map((lang) => (
                  <option key={`nat-${lang}`} value={lang.toLowerCase()}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            {/* Learning Language */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">Learning Language</span>
              </label>
              <select
                className="select select-bordered select-sm"
                value={searchLearning}
                onChange={(e) => setSearchLearning(e.target.value)}
              >
                <option value="">Any</option>
                {LANGUAGES.map((lang) => (
                  <option key={`lrn-${lang}`} value={lang.toLowerCase()}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            {/* Country */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs">Country</span>
              </label>
              <input
                type="text"
                placeholder="e.g. India"
                className="input input-bordered input-sm"
                value={searchCountry}
                onChange={(e) => setSearchCountry(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button type="submit" className="btn btn-primary btn-sm flex-1 sm:flex-none">
              <SearchIcon className="size-4 mr-1" />
              Search
            </button>
            {hasSearched && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleClear}>
                <XCircleIcon className="size-4 mr-1" />
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Results label */}
        {hasSearched && (
          <p className="text-sm opacity-70">
            {loadingSearch
              ? "Searching..."
              : `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""} found`}
          </p>
        )}

        {/* Results Grid */}
        {isLoadingDisplay ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : displayUsers.length === 0 ? (
          <div className="card bg-base-200 p-6 text-center">
            <h3 className="font-semibold text-lg mb-2">
              {hasSearched ? "No users found matching your search" : "No recommendations available"}
            </h3>
            <p className="text-base-content opacity-70">
              {hasSearched
                ? "Try adjusting your search filters"
                : "Check back later for new language partners!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayUsers.map((user) => (
              <div
                key={user._id}
                className="card bg-base-200 hover:shadow-lg transition-all duration-300"
              >
                <div className="card-body p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <Link to={`/profile/${user._id}`} className="avatar size-16 rounded-full">
                      <img src={getProfilePicUrl(user)} alt={user.fullName} />
                    </Link>

                    <div>
                      <Link
                        to={`/profile/${user._id}`}
                        className="font-semibold text-lg hover:underline"
                      >
                        {user.fullName}
                      </Link>
                      {(user.country || user.location) && (
                        <div className="flex items-center text-xs opacity-70 mt-1">
                          <MapPinIcon className="size-3 mr-1" />
                          {user.country || user.location}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Languages with flags */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="badge badge-secondary">
                      {getLanguageFlag(user.nativeLanguage)}
                      Native: {capitialize(user.nativeLanguage)}
                    </span>
                    <span className="badge badge-outline">
                      {getLanguageFlag(user.learningLanguage)}
                      Learning: {capitialize(user.learningLanguage)}
                    </span>
                  </div>

                  {user.bio && <p className="text-sm opacity-70">{user.bio}</p>}

                  {/* Context-aware action button */}
                  {getActionButton(user)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
