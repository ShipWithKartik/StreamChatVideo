import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRooms, joinRoom, findOrCreateRoom, getStreamToken } from "../lib/api";
import useAuthUser from "../hooks/useAuthUser";
import { useRoomStore } from "../store/useRoomStore";
import { capitialize, getProfilePicUrl } from "../lib/utils";
import { LANGUAGE_TO_FLAG, LANGUAGES } from "../constants";
import toast from "react-hot-toast";

import {
  Channel,
  ChannelHeader,
  Chat,
  MessageInput,
  MessageList,
  Thread,
  Window,
} from "stream-chat-react";
import { StreamChat } from "stream-chat";

import { LoaderIcon, MessageSquareIcon, HashIcon, SearchIcon } from "lucide-react";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const RoomFlag = ({ language }) => {
  if (!language) return null;
  const langLower = language.toLowerCase();
  const countryCode = LANGUAGE_TO_FLAG[langLower];
  if (!countryCode) return null;
  return (
    <img
      src={`https://flagcdn.com/24x18/${countryCode}.png`}
      alt={`${langLower} flag`}
      className="h-4 inline-block"
    />
  );
};

const RoomsPage = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const { activeRoom, setActiveRoom } = useRoomStore();

  const [chatClient, setChatClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [loadingChat, setLoadingChat] = useState(false);

  // Find-or-create form state
  const [langOne, setLangOne] = useState("");
  const [langTwo, setLangTwo] = useState("");

  const { data: rooms = [], isLoading: loadingRooms } = useQuery({
    queryKey: ["rooms"],
    queryFn: getRooms,
  });

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  const { mutate: joinMutation, isPending: isJoining } = useMutation({
    mutationFn: joinRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to join room");
    },
  });

  const { mutate: findOrCreateMutation, isPending: isCreating } = useMutation({
    mutationFn: findOrCreateRoom,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setActiveRoom(data.room);
      toast.success(`Joined ${data.room.name}!`);
      setLangOne("");
      setLangTwo("");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to find or create room");
    },
  });

  // Initialize or switch Stream channel when activeRoom changes
  useEffect(() => {
    const connectToRoom = async () => {
      if (!activeRoom || !tokenData?.token || !authUser) return;

      setLoadingChat(true);

      try {
        const client = StreamChat.getInstance(STREAM_API_KEY);

        if (!client.userID) {
          await client.connectUser(
            {
              id: authUser._id,
              name: authUser.fullName,
              image: getProfilePicUrl(authUser),
            },
            tokenData.token
          );
        }

        const roomChannel = client.channel("team", activeRoom.streamChannelId);
        await roomChannel.watch();

        setChatClient(client);
        setChannel(roomChannel);
      } catch (error) {
        console.error("Error connecting to room channel:", error);
        toast.error("Could not connect to room chat");
      } finally {
        setLoadingChat(false);
      }
    };

    connectToRoom();
  }, [activeRoom, tokenData, authUser]);

  const handleSelectRoom = (room) => {
    if (activeRoom?._id === room._id) return;

    // Join endpoint is idempotent — works for both first-time and returning users
    joinMutation(room._id, {
      onSuccess: (data) => {
        setActiveRoom(data.room);
      },
    });
  };

  const handleFindOrCreate = (e) => {
    e.preventDefault();
    if (!langOne || !langTwo) {
      toast.error("Please select both languages");
      return;
    }
    if (langOne === langTwo) {
      toast.error("Please select two different languages");
      return;
    }
    findOrCreateMutation({ languageOne: langOne, languageTwo: langTwo });
  };

  const isWorking = isJoining || isCreating;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* LEFT PANEL — Rooms List */}
      <div className="w-80 min-w-[280px] bg-base-200 border-r border-base-300 flex flex-col">
        <div className="p-4 border-b border-base-300">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <HashIcon className="size-5 text-primary" />
            Language Rooms
          </h2>
          <p className="text-xs opacity-70 mt-1">
            Open group chats — join any room and practice!
          </p>
        </div>

        {/* FIND OR CREATE ROOM */}
        <form onSubmit={handleFindOrCreate} className="p-3 border-b border-base-300 space-y-2">
          <p className="text-xs font-semibold opacity-80 flex items-center gap-1">
            <SearchIcon className="size-3" />
            Find or Create a Room
          </p>
          <div className="flex gap-2">
            <select
              className="select select-bordered select-sm flex-1 min-w-0"
              value={langOne}
              onChange={(e) => setLangOne(e.target.value)}
            >
              <option value="">Language 1</option>
              {LANGUAGES.map((lang) => (
                <option key={`l1-${lang}`} value={lang.toLowerCase()} disabled={lang.toLowerCase() === langTwo}>
                  {lang}
                </option>
              ))}
            </select>
            <span className="flex items-center text-xs opacity-50">↔</span>
            <select
              className="select select-bordered select-sm flex-1 min-w-0"
              value={langTwo}
              onChange={(e) => setLangTwo(e.target.value)}
            >
              <option value="">Language 2</option>
              {LANGUAGES.map((lang) => (
                <option key={`l2-${lang}`} value={lang.toLowerCase()} disabled={lang.toLowerCase() === langOne}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-sm w-full"
            disabled={isWorking || !langOne || !langTwo || langOne === langTwo}
          >
            {isCreating ? (
              <>
                <LoaderIcon className="size-3 animate-spin mr-1" />
                Joining...
              </>
            ) : (
              "Join Room"
            )}
          </button>
        </form>

        {/* ROOMS LIST */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loadingRooms ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8 opacity-70">
              <p className="text-sm">No rooms yet — create one above!</p>
            </div>
          ) : (
            rooms.map((room) => {
              const isActive = activeRoom?._id === room._id;
              return (
                <button
                  key={room._id}
                  onClick={() => handleSelectRoom(room)}
                  disabled={isWorking}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 hover:bg-base-300 ${
                    isActive
                      ? "bg-primary/10 border border-primary/30 ring-1 ring-primary/20"
                      : "bg-base-100 border border-base-300"
                  }`}
                >
                  {/* Room name + flags */}
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <RoomFlag language={room.languageOne} />
                      <span className="text-xs opacity-50">↔</span>
                      <RoomFlag language={room.languageTwo} />
                    </div>
                    <span className="font-semibold text-sm truncate">{room.name}</span>
                  </div>

                  {/* Description */}
                  <p className="text-xs opacity-60 ml-0.5">
                    Practice {capitialize(room.languageOne)} & {capitialize(room.languageTwo)} with
                    native speakers
                  </p>

                  {/* Join indicator */}
                  {isActive && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className="size-1.5 rounded-full bg-success inline-block" />
                      <span className="text-xs text-success">Connected</span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL — Room Chat */}
      <div className="flex-1 flex flex-col">
        {!activeRoom ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquareIcon className="size-8 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold">Select a room to start practicing</h3>
                <p className="text-sm opacity-70 mt-1">
                  Choose a language room from the list or create a new one above
                </p>
              </div>
            </div>
          </div>
        ) : loadingChat || !chatClient || !channel ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <LoaderIcon className="size-8 animate-spin mx-auto text-primary" />
              <p className="text-sm opacity-70">Connecting to {activeRoom.name}...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 h-full">
            <Chat client={chatClient}>
              <Channel channel={channel}>
                <div className="w-full h-full relative">
                  <Window>
                    <ChannelHeader />
                    <MessageList />
                    <MessageInput focus />
                  </Window>
                </div>
                <Thread />
              </Channel>
            </Chat>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomsPage;
