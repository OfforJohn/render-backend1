import { Router } from "express";
import {
  checkUser,
  generateToken,
  
  deleteMessagesByUser,   // ✅ Import deleteMessage here
  
  addUser, // ✅ Add this
  getAllUsers,
  
  addTenUsersWithCustomIds, // ✅ Use actual export name
  deleteBatchUsers,         // ✅ Only if this function is also exported
  onBoardUser,
  
  deleteUser,
} from "./AuthController.js";
import { addUserWithCustomId } from "./AuthController.js";
import { broadcastMessageToAll } from "./AuthController.js";



import {
  setRepliesHandler,
  getRepliesHandler,
  updateReplyHandler,
    addReplyHandler,
  deleteReplyHandler,
} from "./RepliesController.js";



const router = Router();

router.post("/check-user", checkUser);



router.post("/add-reply", addReplyHandler);              // ✅ NEW: stack replies

router.delete("/deleteMessagesByUser/:id", deleteMessagesByUser);

router.get("/get-replies", getRepliesHandler);       // fetch
router.post("/set-replies", setRepliesHandler);      // create
router.put("/update-reply/:id", updateReplyHandler); // update ✅

router.delete("/delete-reply/:id", deleteReplyHandler);


router.post("/message/broadcast", broadcastMessageToAll);

router.post("/add-user", addUser); // ✅ Register the new route

router.post("/add-user-custom-id", addUserWithCustomId);

router.delete("/delete-user/:id", deleteUser); // ✅ Add this line

router.post("/add-batch-users", addTenUsersWithCustomIds);
router.delete("/delete-batch-users/:startId", deleteBatchUsers);
router.post("/onBoardUser", onBoardUser);
router.get("/get-contacts", getAllUsers);
router.get("/generate-token/:userId", generateToken);

export default router;


