document.addEventListener('DOMContentLoaded', async () => {
    const nav = document.getElementById('nav');
    if (nav) {
      try {
        const res = await fetch('nav.html'); // nav.html을 불러옵니다
        const html = await res.text(); // HTML을 텍스트로 받아옵니다
        nav.innerHTML = html; // 받은 HTML을 #nav 요소에 삽입합니다
      } catch (err) {
        console.error("네비게이션 로드 오류:", err);
      }

      const token = localStorage.getItem('token');

      // 로그인 상태일 경우
      if (token) {
        const authLinks = document.getElementById('authLinks');
        const profileLink = document.getElementById('profileLink');

        if (authLinks) {
          authLinks.innerHTML = `
            <button onclick="logout()" style="background:#dc3545; border:none; padding:6px 12px; border-radius:4px; color:white; cursor:pointer;">
              🚪 로그아웃
            </button>
          `;
        }

        if (profileLink) {
          profileLink.style.display = 'inline'; // 프로필 링크 보이게
        }
      }
    }
});

// 로그아웃 함수
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    alert('로그아웃되었습니다.');
    location.href = 'index.html';
}
