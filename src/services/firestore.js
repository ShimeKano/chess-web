import{collection,doc,getDoc,getDocs,limit,orderBy,query,setDoc,serverTimestamp,updateDoc,where,runTransaction}from'firebase/firestore';
import{db}from'../firebase';

const START_FEN='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export async function ensurePlayer(user,name){if(!db)return;const ref=doc(db,'players',user.uid);const snap=await getDoc(ref);if(!snap.exists())await setDoc(ref,{uid:user.uid,name:name||user.email?.split('@')[0]||'Player',elo:1200,wins:0,losses:0,draws:0,games:0,createdAt:serverTimestamp()});}
export async function getLeaderboard(){if(!db)return[];const q=query(collection(db,'players'),orderBy('elo','desc'),limit(50));const s=await getDocs(q);return s.docs.map(d=>({id:d.id,...d.data()}));}
export async function saveGame(game){if(!db)return;await setDoc(doc(collection(db,'games')),{...game,createdAt:serverTimestamp()});}
export async function updatePlayer(uid,data){if(!db)return;await updateDoc(doc(db,'players',uid),data);}

export async function createMatch(user){if(!db)throw Error('Firebase chưa sẵn sàng');const player=await getDoc(doc(db,'players',user.uid));const elo=player.exists()?Number(player.data().elo)||1200:1200;const ref=doc(collection(db,'matches'));await setDoc(ref,{status:'waiting',hostId:user.uid,whitePlayerId:user.uid,blackPlayerId:null,turn:'w',turnPlayerId:user.uid,elo,fen:START_FEN,moves:[],createdAt:serverTimestamp()});return ref.id;}

export async function joinMatch(matchId,user){if(!db)throw Error('Firebase chưa sẵn sàng');const ref=doc(db,'matches',matchId);await runTransaction(db,async tx=>{const snap=await tx.get(ref);if(!snap.exists())throw Error('Không tìm thấy phòng');const m=snap.data();if(m.status!=='waiting')throw Error('Phòng không còn trống');if(m.hostId===user.uid)throw Error('Bạn không thể join phòng của chính mình');tx.update(ref,{status:'playing',blackPlayerId:user.uid,turn:'w',turnPlayerId:m.whitePlayerId,startedAt:serverTimestamp()})});return matchId;}

export async function findRandomMatch(user,immediate=false){if(!db)throw Error('Firebase chưa sẵn sàng');const me=await getDoc(doc(db,'players',user.uid));const myElo=me.exists()?Number(me.data().elo)||1200:1200;const range=immediate?300:200;const q=query(collection(db,'matches'),where('status','==','waiting'),limit(30));const s=await getDocs(q);const candidates=s.docs.filter(d=>d.data().hostId!==user.uid&&Math.abs((Number(d.data().elo)||1200)-myElo)<=range);
for(const candidate of candidates){try{const ref=candidate.ref;await runTransaction(db,async tx=>{const snap=await tx.get(ref);if(!snap.exists()||snap.data().status!=='waiting')throw Error('taken');tx.update(ref,{status:'playing',blackPlayerId:user.uid,turn:'w',turnPlayerId:snap.data().whitePlayerId,startedAt:serverTimestamp()})});return{id:candidate.id};}catch{}}
if(immediate){const ref=doc(collection(db,'matches'));await setDoc(ref,{status:'waiting',hostId:user.uid,whitePlayerId:user.uid,blackPlayerId:null,turn:'w',turnPlayerId:user.uid,elo:myElo,fen:START_FEN,moves:[],createdAt:serverTimestamp()});}
return null;}

export async function leaveQueue(user){if(!db)return;const q=query(collection(db,'matches'),where('status','==','waiting'),limit(50));const s=await getDocs(q);await Promise.all(s.docs.filter(d=>d.data().hostId===user.uid).map(d=>updateDoc(d.ref,{status:'cancelled'})));}
export function watchMatch(matchId,callback){if(!db)return()=>{};return import('firebase/firestore').then(({onSnapshot})=>onSnapshot(doc(db,'matches',matchId),snap=>callback(snap.exists()?{id:snap.id,...snap.data()}:null)));}
export async function updateMatchPosition(matchId,game,move){if(!db)throw Error('Firebase chưa sẵn sàng');const ref=doc(db,'matches',matchId);await runTransaction(db,async tx=>{const snap=await tx.get(ref);if(!snap.exists())throw Error('Ván không tồn tại');const m=snap.data();if(m.status!=='playing')throw Error('Ván đã kết thúc');if(m.turnPlayerId!==move.uid)throw Error('Không phải lượt của bạn');const expectedColor=m.whitePlayerId===move.uid?'w':'b';if(game.turn()===expectedColor)throw Error('Nước đi không hợp lệ');const moves=Array.isArray(m.moves)?m.moves:[];const nextPlayer=m.whitePlayerId===move.uid?m.blackPlayerId:m.whitePlayerId;tx.update(ref,{fen:game.fen(),turn:game.turn(),turnPlayerId:nextPlayer,moves:[...moves,move],status:game.isGameOver()?'finished':'playing',finishedAt:game.isGameOver()?serverTimestamp():null});});}
