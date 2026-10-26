import React, { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import foundations from '../../docs/opening-coach/lessons/ruy-lopez-01-foundations.json';
import whiteMorphy from '../../docs/opening-coach/lessons/ruy-lopez-02-white-morphy.json';
import blackAfterCastling from '../../docs/opening-coach/lessons/ruy-lopez-03-black-after-castling.json';

const LESSONS = [foundations, whiteMorphy, blackAfterCastling];

function exercisePosition(lesson, exercise) {
  const game = new Chess(lesson.startFen);
  for (const san of exercise.positionAfter) {
    if (!game.move(san)) throw new Error('Nước đi không hợp lệ trong bài: ' + san);
  }
  return game;
}

export default function OpeningLessons() {
  const [lessonIndex, setLessonIndex] = useState(0);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [hintIndex, setHintIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const lesson = LESSONS[lessonIndex];
  const exercise = lesson.exercises[exerciseIndex];
  const position = useMemo(() => exercisePosition(lesson, exercise), [lesson, exercise]);
  const legalMoves = position.moves();
  const options = [...new Set([
    ...lesson.branches.map(branch => branch.san),
    ...exercise.acceptedMoves,
    ...Object.keys(exercise.wrongMoveFeedback || {})
  ])].filter(san => legalMoves.includes(san));
  const isCorrect = answer && exercise.acceptedMoves.includes(answer);
  const feedback = answer
    ? (exercise.feedback?.[answer] || exercise.wrongMoveFeedback?.[answer] || (isCorrect
      ? 'Đúng. Hãy chú ý kế hoạch phía sau nước đi này.'
      : 'Nước này hợp lệ nhưng chưa khớp mục tiêu của câu hỏi. Đọc lại gợi ý và thử phương án khác.'))
    : '';

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
        <strong>Bài học Ruy López</strong>
        <p>{LESSONS.length} bài mẫu · không cần API key · nước đi được kiểm tra bằng chess.js</p>
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
    {lesson.sections.map(section => <article className="lessonSection" key={section.id}>
      <h3>{section.heading}</h3>
      <p>{section.body}</p>
      {section.keyPoints?.length > 0 && <ul>{section.keyPoints.map(point => <li key={point}>{point}</li>)}</ul>}
    </article>)}
    <div className="lessonExercise">
      <div className="lessonExerciseTop">
        <strong>Thực hành {exerciseIndex + 1}/{lesson.exercises.length}</strong>
        <span>{exercise.difficulty || 'Luyện tập'}</span>
      </div>
      <p>{exercise.prompt}</p>
      <p className="lessonPosition"><span>Vị trí trước khi đi:</span> {exercise.positionAfter.map((san, index) => <React.Fragment key={san + index}>{index % 2 === 0 && <b>{Math.floor(index / 2) + 1}{index % 2 === 0 ? '.' : ''} </b>}{san}{' '}</React.Fragment>)}</p>
      <div className="lessonMoveOptions">
        {options.map(san => <button key={san} className={answer === san ? (exercise.acceptedMoves.includes(san) ? 'correct' : 'chosen') : ''} onClick={() => setAnswer(san)}>{san}</button>)}
      </div>
      {feedback && <div className={'lessonFeedback ' + (isCorrect ? 'success' : 'retry')} role="status">
        <strong>{isCorrect ? 'Chính xác' : 'Thử lại / xem ý tưởng'}</strong>
        <p>{feedback}</p>
      </div>}
      {hintIndex < exercise.hintLevels.length && <button className="lessonHint" onClick={() => setHintIndex(value => Math.min(value + 1, exercise.hintLevels.length))}>Gợi ý {hintIndex + 1}/{exercise.hintLevels.length}</button>}
      {hintIndex > 0 && <p className="lessonHintText">{exercise.hintLevels[hintIndex - 1]}</p>}
      {exercise.followUp && <p className="lessonFollowUp">{exercise.followUp}</p>}
      <div className="lessonNavigation">
        <button disabled={exerciseIndex === 0} onClick={() => changeExercise(exerciseIndex - 1)}>Bài tập trước</button>
        <button disabled={exerciseIndex >= lesson.exercises.length - 1} onClick={() => changeExercise(exerciseIndex + 1)}>Bài tập tiếp</button>
      </div>
    </div>
    <div className="lessonNavigation lessonCourseNavigation">
      <button disabled={lessonIndex === 0} onClick={() => changeLesson(lessonIndex - 1)}>Bài học trước</button>
      <button disabled={lessonIndex >= LESSONS.length - 1} onClick={() => changeLesson(lessonIndex + 1)}>Bài học tiếp</button>
    </div>
  </div>;
}
