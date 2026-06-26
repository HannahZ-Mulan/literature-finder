import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		fontFamily: {
			sans: ['var(--font-sans)', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
			serif: ['var(--font-serif)', '"Songti SC"', '"SimSun"', 'Georgia', 'serif'],
		},
		// Warm Scholar 语义色阶（与 globals.css 的 chart 变量呼应）
		// sage = 苔绿（AI 笔记区身份色，原 green/emerald 映射至此）
		sage: {
			'50': '90 14% 94%', '100': '88 16% 88%', '200': '90 18% 78%', '300': '92 20% 65%',
			'400': '94 22% 52%', '500': '95 22% 40%', '600': '100 20% 32%', '700': '105 18% 26%',
			'800': '108 16% 20%', '900': '110 14% 16%',
		},
		// clay = 陶土赭（点缀/警示，呼应 destructive 与 chart-2）
		clay: {
			'50': '20 50% 94%', '100': '18 55% 88%', '200': '16 58% 80%', '300': '15 60% 70%',
			'400': '14 62% 58%', '500': '14 62% 48%', '600': '14 62% 41%', '700': '16 55% 34%',
			'800': '18 48% 27%', '900': '20 42% 21%',
		},
		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
