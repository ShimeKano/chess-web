import React,{useEffect,useMemo,useRef,useState}from'react';
import{onAuthStateChanged}from'firebase/auth';
import{auth,firebaseConfigured,db}from'./firebase';
import{register,login,logout}from'./services/auth';
import{ensurePlayer,getLeaderboard,createMatch,joinMatch,watchMatch,findRandomMatch,leaveQueue,updateMatchPosition}from'./services/firestore';
import{Chess}from'chess.js';
import{analyse}from'./services/stockfish';
import'./styles.css';

const files=['a','b','c','d','e','f','g','h'];
const pieces={p:'♟',r:'♜',n:'♞',b:'♝',q:'♛',k:'♚',P:'♙',R:'♖',N:'♘',B:'♗',Q:'♕',K:'♔'};

function Board({game,onMove,disabled=false}){
 const b=game.board(),[selected,setSelected]=useState(null);
 const legal=useMemo(()=>selected?game.moves({square:selected,verbose:true}):[],[game.fen(),selected]);
 const targets=new Map(legal.map(m=>[m.to,m]));
 function click(sq){
  if(disabled)return;
  const p=game.get(sq);
  if(selected&&targets.has(sq)){onMove(selected,sq);setSelected(null);return}
  if(p&&p.color===game.turn()){setSelected(sq);return}
  setSelected(null);
 }
 return <div className="board">{b.flatMap((row,r)=>row.map((p,c)=>{
  const sq=files[c]+(8-r),isSel=selected===sq,m=targets.get(sq);
  return <button key={sq} className={'square '+((r+c)%2?'dark':'light')+(isSel?' selected':'')+(m?' hasMove':'')} onClick={()=>click(sq)}>
   {m&&<span className={m.captured?'moveDot capture':'moveDot'}/>}
   {p&&<span className={p.color==='w'?'whitePiece':'blackPiece'}>{pieces[p.color==='w'?p.type.toUpperCase():p.type]}</span>}
  </button>
 }))}</div>
}

function AuthBox(){const[mode,setMode]=useState('login'),[email,setEmail]=useState(''),[pass,setPass]=useState(''),[name,setName]=useState(''),[err,setErr]=useState('');
 async function go(e){e.preventDefault();setErr('');try{if(mode==='login')await login(email,pass);else await register(email,pass,name)}catch(x){setErr(x.message)}}
 return <form className="auth" onSubmit={go}><h2>{mode==='login'?'Đăng nhập':'Tạo tài khoản'}</h2>{mode==='register'&&<input placeholder="Tên người chơi" value={name} onChange={e=>setName(e.target.value)} required/>}<input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/><input type="password" placeholder="Mật khẩu" value={pass} onChange={e=>setPass(e.target.value)} minLength="6" required/><button className="primary">{mode==='login'?'Đăng nhập':'Đăng ký'}</button>{err&&<p className="error">{err}</p>}<button type="button" className="link" onClick={()=>setMode(mode==='login'?'register':'login')}>{mode==='login'?'Chưa có tài khoản? Đăng ký':'Đã có tài khoản? Đăng nhập'}</button></form>}

function App(){
 const[user,setUser]=useState(null),[game,setGame]=useState(new Chess()),[leader,setLeader]=useState([]),[status,setStatus]=useState('Chọn cách chơi'),[best,setBest]=useState(''),[mode,setMode]=useState(null),[matchId,setMatchId]=useState(null),[match,setMatch]=useState(null),[room,setRoom]=useState(''),[queueing,setQueueing]=useState(false),[searchStarted,setSearchStarted]=useState(0),[err,setErr]=useState('');
 const timer=useRef(null);
 useEffect(()=>auth?onAuthStateChanged(auth,async u=>{setUser(u);if(u)await ensurePlayer(u,u.email?.split('@')[0])}):undefined,[]);
 useEffect(()=>{getLeaderboard().then(setLeader).catch(()=>{})},[user]);
 useEffect(()=>()=>{if(timer.current)clearInterval(timer.current)},[]);
 useEffect(()=>{if(!matchId||!db)return;return watchMatch(matchId,setMatch)},[matchId]);
 useEffect(()=>{if(match){const g=new Chess(match.fen);setGame(g);setStatus(match.status==='playing'?(g.turn()==='w'?'White to move':'Black to move'):match.status==='finished'?'Ván đã kết thúc':'Đang chờ đối thủ…')}},[match]);
 useEffect(()=>{if(!queueing)return;timer.current=setInterval(async()=>{try{const found=await findRandomMatch(user);if(found){setQueueing(false);setMatchId(found.id);setMode('online')}}catch(e){setErr(e.message)}},3000);return()=>clearInterval(timer.current)},[queueing,user]);
 async function random(){setErr('');setMode('search');setQueueing(true);setSearchStarted(Date.now());try{const found=await findRandomMatch(user,true);if(found){setQueueing(false);setMatchId(found.id);setMode('online');return}await findRandomMatch(user,false)}catch(e){setQueueing(false);setErr(e.message)}}
 useEffect(()=>{if(!queueing||!searchStarted)return;const t=setTimeout(async()=>{try{const found=await findRandomMatch(user);if(found){setQueueing(false);setMatchId(found.id);setMode('online')}else{setQueueing(false);setMode('bot');setGame(new Chess());setStatus('Bạn đang đấu Stockfish');setErr('Không tìm thấy đối thủ phù hợp sau 2 phút — chuyển sang Stockfish.')}}catch(e){setQueueing(false);setErr(e.message)}},120000);return()=>clearTimeout(t)},[queueing,searchStarted,user]);
 async function createRoom(){setErr('');try{const id=await createMatch(user);setMatchId(id);setMode('online');setStatus('Đang chờ đối thủ…')}catch(e){setErr(e.message)}}
 async function joinRoom(){setErr('');if(!room.trim())return;try{const id=await joinMatch(room.trim(),user);setMatchId(id);setMode('online')}catch(e){setErr(e.message)}}
 async function move(from,to){if(mode==='bot'){if(game.turn()!=='w')return;const g=new Chess(game.fen());try{g.move({from,to,promotion:'q'})}catch{return}setGame(g);setStatus(g.isGameOver()?'Game over':'Stockfish is thinking…');if(!g.isGameOver())setTimeout(async()=>{const bestMove=await analyse(g.fen(),12);if(!bestMove)return;const b=new Chess(g.fen());try{b.move(bestMove)}catch{return}setGame(b);setStatus(b.isGameOver()?'Game over':'White to move')},100);return}
 if(!match||match.status!=='playing'||match.turn!==user.uid)return;
 const g=new Chess(match.fen);let m;try{m=g.move({from,to,promotion:'q'})}catch{return}if(!m)return;
 await updateMatchPosition(match.id,g,{from,to,notation:m.san,uid:user.uid});
 }
 async function analyze(){setBest('Đang phân tích…');try{const m=await analyse(game.fen(),12);setBest(m||'Không có nước đi')}catch{setBest('Stockfish chưa sẵn sàng')}}
 async function stopSearch(){setQueueing(false);setMode(null);setStatus('Đã hủy tìm đối thủ');try{await leaveQueue(user)}catch{}}
 function newLocal(){setMode(null);setMatchId(null);setMatch(null);setGame(new Chess());setBest('');setErr('');setStatus('Chọn cách chơi')}
 if(!firebaseConfigured)return <main><header><div><h1>♟ Chess Web</h1><p>Easy chess. Real players. ELO. Accuracy. History.</p></div></header><div className="notice">Firebase chưa cấu hình.</div><AuthBox/></main>;
 return <main><header><div><h1>♟ Chess Web</h1><p>Easy chess. Real players. ELO. Accuracy. History.</p></div>{user&&<button onClick={logout}>Đăng xuất</button>}</header>
 {!user?<section className="hero"><AuthBox/><div className="info"><h2>Competitive chess, kept simple.</h2><p>Chơi cờ online với người thật, ELO và lịch sử trận đấu.</p></div></section>:
 <section className="gameLayout"><div>
  {!mode&&<div className="lobby"><h2>Chơi online</h2><div className="lobbyGrid"><button className="primary" onClick={random}>🎯 Tìm đối thủ ngẫu nhiên</button><button onClick={createRoom}>➕ Tạo phòng</button></div><div className="join"><input placeholder="Mã phòng" value={room} onChange={e=>setRoom(e.target.value.toUpperCase())}/><button onClick={joinRoom}>Join phòng</button></div><p>Ghép random ưu tiên đối thủ gần ELO. Nếu chờ quá 2 phút, hệ thống chuyển sang Stockfish.</p></div>}
  {mode==='search'&&<div className="searchBox"><strong>🔎 Đang tìm đối thủ…</strong><span>Đối thủ được ghép theo ELO.</span><button onClick={stopSearch}>Hủy tìm</button></div>}
  {mode&&(mode==='online'||mode==='bot')&&<><div className="gameTop"><strong>{status}</strong><button onClick={newLocal}>Rời ván</button></div><Board game={game} onMove={move} disabled={mode==='online'&&(!match||match.status!=='playing'||match.turn!==user.uid)}/><div className="controls"><button onClick={analyze}>Phân tích vị trí</button><span>{best&&'Best move: '+best}</span></div></>}
  {err&&<p className="error">{err}</p>}
 </div><aside><h2>Leaderboard</h2>{leader.map((p,i)=><div className="rank" key={p.id}><b>#{i+1}</b><span>{p.name}</span><strong>{p.elo}</strong></div>)}{!leader.length&&<p>Chưa có dữ liệu ELO.</p>}<hr/><h3>Tài khoản</h3><p>{user.email}</p><small>ELO mặc định: 1200</small></aside></section>}</main>
}
export default App;