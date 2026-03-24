export const capitialize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?background=random&color=fff&name=User";

export const getProfilePicUrl = (user) => {
  if (!user) return DEFAULT_AVATAR;
  return user.profilePicture || user.profilePic || DEFAULT_AVATAR;
};
