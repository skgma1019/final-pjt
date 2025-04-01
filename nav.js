// nav.js
document.addEventListener('DOMContentLoaded', async () => {
    const nav = document.getElementById('nav');
    if (nav) {
      const res = await fetch('nav.html'); // nav.html이 같은 폴더일 경우
      const html = await res.text();
      nav.innerHTML = html;
  
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
          profileLink.style.display = 'inline';
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
  