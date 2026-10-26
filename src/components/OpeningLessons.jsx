import React, { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import foundations from '../../docs/opening-coach/lessons/ruy-lopez-01-foundations.json';
import whiteMorphy from '../../docs/opening-coach/lessons/ruy-lopez-02-white-morphy.json';
import blackAfterCastling from '../../docs/opening-coach/lessons/ruy-lopez-03-black-after-castling.json';

const LESSONS = [foundations, whiteMorphy, blackAfterCastling];

function buildPosition(lesson, exercise) {
  const game = new Chess(lesson.startFen);
  for (const san of exercise.positionAfter) {
    const move = game.move(san);
    if (!move) throw new Error('Nước đi không hợp lệ trong bài: ' + san);
  }
  return game;
}

export default function OpeningLessons({ onPositionChange }) {
  const [lessonIndex, setLessonIndex] = useState(0);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [hintIndex, setHintIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const lesson = LESSONS[lessonIndex];
  const exercise = lesson.exercises[exerciseIndex];
  const position = useMemo(() => buildPosition(lesson, exercise), [lesson, exercise]);
  const legalMoves = position.moves();
  const distractors = Object.keys(exercise.wrongMoveFeedback || {});
  const options = [...new Set([...exercise.acceptedMoves, ...distractors, ...legalMoves.slice(0, 4)])]
    .filter(san => legalMoves.includes(san))
    .sort((a, b) => a.localeCompare(b));
  const isCorrect = Boolean(answer && exercise.acceptedMoves.includes(answer));
  const feedback = answer
    ? (exercise.feedback?.[answer] || exercise.wrongMoveFeedback?.[answer] ||
      (isCorrect ? 'Chính xác. Hãy chú ý kế hoạch phía sau nước đi này.' : 'Nước này hợp lệ nhưng chưa khớp mục tiêu của câu hỏi. Đọc lại gợi ý và thử phương án khác.'))
    : '';
  const moveList = exercise.positionAfter.map((san, index) => ({
    san,
    prefix: index % 2 === 0 ? Math.floor(index / 2) + 1 + '.' : ''
  }));

  useEffect(() => {
    onPositionChange?.(position.fen());
  }, [position, onPositionChange]);

  function changeLesson(nextIndex) {
    setLessonIndex(nextIndex);
    setExerciseIndex(0);
    setHintIndex(0);
    setAnswer('');
  }

  function changeExercise(nextIndex) {
    setExerciseIndex(nextIndex);
    setHintIndex(0);
    setAnswer('');
  }

  return <div className="openingLessons">
    <div className="lessonHeading">
      <div>
        <strong>Ruy López · lộ trình học</strong>
        <p>{lessonIndex + 1}/{LESSONS.length} bài · {lesson.estimatedMinutes || '—'} phút · không cần API</p>
      </div>
      <label>Bài học
        <select value={lessonIndex} onChange={event => changeLesson(Number(event.target.value))}>
          {LESSONS.map((item, index) => <option key={item.id} value={index}>{index + 1}. {item.title}</option>)}
        </select>
      </label>
    </div>
    <div className="lessonObjectives">
      <strong>Mục tiêu</strong>
      <ul>{lesson.objectives.map(item => <li key={item}>{item}</li>)}</ul>
    </div>
    <div className="lessonMoveLine" aria-label="Các nước dẫn đến vị trí này">
      <span>Vị trí trong bài:</span>
      {moveList.map((move, index) => <span className="lessonSan" key={move.san + index}>{move.prefix && <b>{move.prefix}</b>} {move.san}</span>)}
    </div>
    {lesson.sections.map(section => <article className="lessonSection" key={section.id}>
      <h3>{section.heading}</h3>
      <p>{section.body}</p>
      {section.keyPoints?.length > 0 && <ul>{section.keyPoints.map(point => <li key={point}>{point}</li>)}</ul>}
    </article>)}
    <div className="lessonExercise">
      <div className="lessonExerciseTop">
        <strong>Câu hỏi {exerciseIndex + 1}/{lesson.exercises.length}</strong>
        <span>{exercise.difficulty || 'Luyện tập'}</span>
      </div>
      <p className="lessonPrompt">{exercise.prompt}</p>
      <p className="lessonAnswerInstruction">Chọn một nước đi bên dưới để trả lời:</p>
      <div className="lessonMoveOptions">
        {options.map(san => <button type="button" key={san} className={answer === san ? (isCorrect ? 'correct' : 'chosen') : ''} aria-pressed={answer === san} onClick={() => setAnswer(san)}>{san}</button>)}
      </div>
      {feedback && <div className={'lessonFeedback ' + (isCorrect ? 'success' : 'retry')} role="status">
        <strong>{isCorrect ? 'Đúng rồi' : 'Chưa đúng với mục tiêu câu hỏi'}</strong>
        <p>{feedback}</p>
      </div>}
      {hintIndex < (exercise.hints || []).length && <button type="button" className="lessonHint" onClick={() => setHintIndex(value => Math.min(value + 1, (exercise.hints || []).length))}>Xem gợi ý {hintIndex + 1}/{(exercise.hints || []).length}</button>}
      {hintIndex > 0 && <p className="lessonHintText">{exercise.hints[hintIndex - 1]}</p>}
      {exercise.followUp && <p className="lessonFollowUp">{exercise.followUp}</p>}
      <div className="lessonNavigation">
        <button type="button" disabled={exerciseIndex === 0} onClick={() => changeExercise(exerciseIndex - 1)}>Câu trước</button>
        <button type="button" disabled={exerciseIndex >= lesson.exercises.length - 1} onClick={() => changeExercise(exerciseIndex + 1)}>Câu tiếp</button>
      </div>
    </div>
    <div className="lessonNavigation lessonCourseNavigation">
      <button type="button" disabled={lessonIndex === 0} onClick={() => changeLesson(lessonIndex - 1)}>Bài trước</button>
      <button type="button" disabled={lessonIndex >= LESSONS.length - 1} onClick={() => changeLesson(lessonIndex + 1)}>Bài tiếp</button>
    </div>
  </div>;
}
