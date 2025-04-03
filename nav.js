// ✅ 자동 로그아웃 기능을 포함한 nav.js + fetchWithAuth를 다른 곳에서도 재사용할 수 있게 전역 정의

// 로그아웃 함수 (공통)
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user_id');
  alert('로그아웃되었습니다.');
  location.href = 'index.html';
}

// 토큰 만료 여부 확인 함수 (공통)
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch (e) {
    return true;
  }
}

// 공통 fetch 래퍼 함수 (백엔드 응답 401 자동 처리)
async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = options.headers || {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    alert('로그인 정보가 만료되었습니다. 다시 로그인해주세요.');
    logout();
    return null;
  }

  return response;
}

// 네비게이션 바 처리 및 자동 로그아웃 체크

document.addEventListener('DOMContentLoaded', async () => {
  const nav = document.getElementById('nav');
  if (nav) {
    try {
      const res = await fetch('nav.html');
      const html = await res.text();
      nav.innerHTML = html;

      const token = localStorage.getItem('token');

      if (token) {
        // 🔐 토큰 만료 여부 확인
        if (isTokenExpired(token)) {
          alert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
          logout();
          return;
        }

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
          profileLink.style.display = 'inline';
        }
      } else {
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
