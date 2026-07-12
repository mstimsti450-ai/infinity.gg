import { createClient } from "@supabase/supabase-js";

// Bu dosya `app/api/**/route.ts` içindeki `import { supabase } from "@/lib/supabase"`
// satırlarının işaret ettiği, kayıp olan dosya. Standart bir Supabase server client kurulumu —
// projeye özel bir mantık içermiyor, bu yüzden güvenle yeniden yazılabilir.
//
// ÖNEMLİ: terminal loglarında "SUPABASE_URL" ve "ANON_KEY" isimleriyle debug basıyordunuz,
// o yüzden aşağıda ÖNCELİKLE o isimleri arıyorum. Ama Next.js projelerinde genelde
// NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY kullanılır — ikisini de destekliyorum,
// hangisi .env.local'de tanımlıysa o kullanılacak. .env.local dosyanı kontrol edip gerçek
// isimlerin bunlarla eşleştiğinden emin ol; eşleşmiyorsa bana gerçek isimleri söyle, düzeltirim.
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Build sırasında sessizce patlamasın diye throw etmiyoruz, ama runtime'da route çağrıldığında
  // net bir hata mesajı görünsün istiyoruz (aksi halde "Cannot find module" yerine anlaşılmaz
  // bir Supabase hatası alırdınız).
  console.error(
    "[lib/supabase] SUPABASE_URL veya SUPABASE_ANON_KEY (ya da NEXT_PUBLIC_ eşdeğerleri) .env.local içinde bulunamadı."
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");