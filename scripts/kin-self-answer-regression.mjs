import assert from "node:assert/strict";
import { inspectKinSelfAnswer } from "./kin-question-page.mjs";

const myProfile = "myPublicProfileToken=";

const ownByProfile = `
<div id="answer_3" class="answerArea _contentWrap _answer">
  <div class="profile_card _profileCardArea">
    <a href="/profile/index.naver?u=myPublicProfileToken%3D" class="card_inner">
      <strong class="name">3분 전</strong>
    </a>
  </div>
</div>
`;

const sameNicknameOtherProfile = `
<div id="answer_4" class="answerArea _contentWrap _answer">
  <div class="profile_card _profileCardArea">
    <a href="/profile/index.naver?u=someoneElse%3D" class="card_inner">
      <strong class="name">3분 전</strong>
    </a>
  </div>
</div>
`;

const loggedInMyAnswer = `
<div id="answer_2" class="answerArea _contentWrap _answer _myAnswer">
  <div class="profile_card _profileCardArea">
    <a href="/profile/index.naver?u=someoneElse%3D" class="card_inner">
      <strong class="name">다른 별명</strong>
    </a>
  </div>
</div>
`;

const own = inspectKinSelfAnswer(ownByProfile, {
  profileU: myProfile,
  nickname: "3분 전",
});
assert.equal(own.answered, true);
assert.equal(own.matchedBy, "profile-u");
assert.equal(own.answerNo, "3");

const nicknameOnly = inspectKinSelfAnswer(sameNicknameOtherProfile, {
  profileU: myProfile,
  nickname: "3분 전",
});
assert.equal(
  nicknameOnly.answered,
  false,
  "닉네임만 같아서는 본인 답변으로 판정하면 안 됩니다.",
);

const myAnswerClass = inspectKinSelfAnswer(loggedInMyAnswer, {
  profileU: myProfile,
  nickname: "3분 전",
});
assert.equal(myAnswerClass.answered, true);
assert.equal(myAnswerClass.matchedBy, "my-answer-class");

console.log("지식iN 본인 답변 회귀 테스트 통과: profile u 우선 + nickname 단독 오탐 방지");
