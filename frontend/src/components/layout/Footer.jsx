import { useUiStore } from '@store/uiStore';
import { Github, Twitter, Youtube, Linkedin, ArrowUpRight, Mail } from 'lucide-react';

export default function Footer() {
  const lang = useUiStore((state) => state.language) || 'vi';

  const content = {
    vi: {
      product: 'SẢN PHẨM',
      productLinks: ['Tính năng', 'Bảng giá', 'Khách hàng', 'Tích hợp'],
      developers: 'LẬP TRÌNH VIÊN',
      devLinks: ['Tài liệu API', 'Mã nguồn GitHub', 'Cộng đồng', 'Trạng thái'],
      company: 'CÔNG TY',
      companyLinks: ['Về chúng tôi', 'Tuyển dụng', 'Chính sách bảo mật', 'Điều khoản sử dụng'],
      newsletter: 'BẢN TIN',
      emailHolder: 'email@cua-ban.com',
      newsletterDesc: 'Nhận thông tin cập nhật mới nhất từ TaskFlow.',
      themeLight: 'Sáng',
      themeDark: 'Tối',
    },
    en: {
      product: 'PRODUCT',
      productLinks: ['Features', 'Pricing', 'Customers', 'Integrations'],
      developers: 'DEVELOPERS',
      devLinks: ['API Docs', 'GitHub Repo', 'Community', 'System Status'],
      company: 'COMPANY',
      companyLinks: ['About Us', 'Careers', 'Privacy Policy', 'Terms of Service'],
      newsletter: 'NEWSLETTER',
      emailHolder: 'your@email.com',
      newsletterDesc: 'Get the latest updates and news from TaskFlow.',
      themeLight: 'Light',
      themeDark: 'Dark',
    }
  };

  const t = content[lang] || content.vi;

  return (
    <footer style={{
      backgroundColor: '#111317', // Very dark slate/black, similar to the screenshot
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      color: 'rgba(255, 255, 255, 0.6)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        
        {/* Top Section - 4 Columns */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '40px', 
          padding: '60px 40px',
        }}>
          {/* Logo & Product */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, color: 'white' }}>
              <div style={{ 
                width: 28, height: 28, borderRadius: 6, 
                backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' 
              }}>
                <div style={{ width: 12, height: 12, border: '3px solid #111317', borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>TaskFlow</span>
            </div>
            
            <h4 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', marginBottom: 20, color: 'rgba(255, 255, 255, 0.4)' }}>
              {t.product}
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {t.productLinks.map((link, i) => (
                <li key={i}>
                  <a href="#" style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', fontSize: 13, transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.target.style.color = 'white'}
                    onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}>
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Developers */}
          <div style={{ marginTop: 68 }}>
            <h4 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', marginBottom: 20, color: 'rgba(255, 255, 255, 0.4)' }}>
              {t.developers}
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {t.devLinks.map((link, i) => (
                <li key={i}>
                  <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', fontSize: 13, transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}>
                    {link}
                    {i === 1 && <Github size={14} />} 
                    {i === 1 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 999 }}>2.4K</span>}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div style={{ marginTop: 68 }}>
            <h4 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', marginBottom: 20, color: 'rgba(255, 255, 255, 0.4)' }}>
              {t.company}
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {t.companyLinks.map((link, i) => (
                <li key={i}>
                  <a href="#" style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', fontSize: 13, transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.target.style.color = 'white'}
                    onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.7)'}>
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div style={{ marginTop: 68 }}>
            <h4 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', marginBottom: 20, color: 'rgba(255, 255, 255, 0.4)' }}>
              {t.newsletter}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ 
                display: 'flex', alignItems: 'center', flex: 1, 
                border: '1px solid rgba(255, 255, 255, 0.15)', borderRight: 'none',
                padding: '8px 12px', gap: 8 
              }}>
                <Mail size={14} color="rgba(255, 255, 255, 0.4)" />
                <input 
                  type="email" 
                  placeholder={t.emailHolder}
                  style={{ 
                    background: 'transparent', border: 'none', outline: 'none', 
                    color: 'white', width: '100%', fontSize: 13
                  }}
                />
              </div>
              <button style={{ 
                background: 'white', color: 'black', border: 'none', cursor: 'pointer',
                padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = 0.8}
              onMouseLeave={(e) => e.currentTarget.style.opacity = 1}>
                <ArrowUpRight size={18} />
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.4)', lineHeight: 1.5 }}>
              {t.newsletterDesc}
            </p>
          </div>
        </div>

        {/* Middle Section - Giant Animated Marquee Text */}
        <div style={{ 
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '20px 0',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          userSelect: 'none'
        }}>
          <div style={{
            display: 'inline-block',
            animation: 'marquee 40s linear infinite',
          }}>
            <span style={{ 
              fontSize: '5vw', 
              fontWeight: 900, 
              color: 'white', 
              letterSpacing: '0.04em',
              fontFamily: 'Impact, sans-serif',
              textTransform: 'uppercase',
              marginRight: '20px'
            }}>
              TASKFLOW MANAGE TASKFLOW ORGANIZE TASKFLOW COLLABORATE TASKFLOW SYNC 
            </span>
            {/* Duplicated for seamless loop */}
            <span style={{ 
              fontSize: '5vw', 
              fontWeight: 900, 
              color: 'white', 
              letterSpacing: '0.04em',
              fontFamily: 'Impact, sans-serif',
              textTransform: 'uppercase',
              marginRight: '20px'
            }}>
              TASKFLOW MANAGE TASKFLOW ORGANIZE TASKFLOW COLLABORATE TASKFLOW SYNC 
            </span>
          </div>
        </div>

        {/* Bottom Section - Social & Theme */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 40px',
          flexWrap: 'wrap',
          gap: 20
        }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'GitHub', icon: <Github size={14} /> },
              { label: 'Discord', icon: <span style={{fontSize: 14, fontWeight: 'bold'}}>D</span> }, // Placeholder for discord
              { label: 'Twitter/X', icon: <Twitter size={14} /> },
              { label: 'YouTube', icon: <Youtube size={14} /> },
              { label: 'LinkedIn', icon: <Linkedin size={14} /> },
            ].map((social, i) => (
              <a key={i} href="#" style={{ 
                display: 'flex', alignItems: 'center', gap: 6, 
                color: 'rgba(255, 255, 255, 0.6)', 
                textDecoration: 'none', fontSize: 12, fontWeight: 500,
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}>
                {social.icon} {social.label}
              </a>
            ))}
          </div>

          <div style={{ display: 'flex', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: 4, overflow: 'hidden' }}>
            <button style={{ 
              background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 0.5)', 
              padding: '6px 16px', fontSize: 11, cursor: 'pointer', transition: 'all 0.2s',
              borderRight: '1px solid rgba(255, 255, 255, 0.15)'
            }}
            onMouseEnter={(e) => e.target.style.color='white'}
            onMouseLeave={(e) => e.target.style.color='rgba(255, 255, 255, 0.5)'}>
              {t.themeLight}
            </button>
            <button style={{ 
              background: 'white', border: 'none', color: 'black', fontWeight: 600,
              padding: '6px 16px', fontSize: 11, cursor: 'default'
            }}>
              {t.themeDark}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </footer>
  );
}
