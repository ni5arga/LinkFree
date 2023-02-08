import connectMongo from "../../../config/mongo";
import logger from "../../../config/logger";
import ProfileStats from "../../../models/ProfileStats";
import loadProfiles from "../../../services/profiles/loadProfiles";

export default async function handler(req, res) {
  if (req.method != "GET") {
    return res
      .status(400)
      .json({ error: "Invalid request: GET request required" });
  }

  const { statusCode, data } = await getTrendingApi();
  res.status(statusCode).json(data);
}

export async function getTrendingApi() {

  await connectMongo();

  let getProfiles = [];
  try {
    getProfiles = await ProfileStats.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 1)),
          },
          username: { $nin: process.env.SHADOWBAN.split(",") },
        },
      },
      {
        $group: {
          _id: "$profile",
          username: { $first: "$username" },
          views: {
            $sum: "$views",
          },
        },
      },
      {
        $sort: {
          views: -1,
        },
      },
      {
        $limit: 20,
      },
    ]);
  } catch (e) {
    logger.error(e, "failed to load profile stats");
  }

  // check for db results
  if (getProfiles.length === 0) {
    return {
      statusCode: 404,
      data: []
    };
  }

  // merge profiles with their profile views if set to public
  console.log(getProfiles)
  const profiles = await loadProfiles(getProfiles);

  const slicedProfiles = profiles.slice(0, 5)
    .map((profile) =>{
      return {
        ...profile,
        _id: profile._id.toString(),
      };
    });

  return {
    statusCode: 200,
    data: slicedProfiles
  };
}
