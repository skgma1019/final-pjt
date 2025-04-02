document.addEventListener('DOMContentLoaded', async () => {
  const nav = document.getElementById('nav');
  if (nav) {
    try {
      const res = await fetch('nav.html'); // nav.html을 불러옴
      const html = await res.text();
      nav.innerHTML = html;

      const token = localStorage.getItem('token');

      if (token) {
        const authLinks = document.getElementById('authLinks');
        const profileLink = document.getElementById('profileLink');

        // 로그인 상태
        if (authLinks) {
          authLinks.innerHTML = `
            <button onclick="logout()" style="background:#dc3545; border:none; padding:6px 12px; border-radius:4px; color:white; cursor:pointer;">
              🚪 로그아웃
            </button>
          `;
        }

        if (profileLink) {
          profileLink.style.display = 'inline';
        }
      } else {
        // 비로그인 상태일 때 로그인/회원가입 버튼 추가
        const authLinks = document.getElementById('authLinks');
        if (authLinks) {
          authLinks.innerHTML = `
            <a href="login.html" style="color:white; margin: 0 10px;">🔐 로그인</a>
            <a href="register.html" style="color:white; margin: 0 10px;">📝 회원가입</a>
          `;
        }
      }
    } catch (err) {
      console.error("네비게이션 로드 오류:", err);
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
