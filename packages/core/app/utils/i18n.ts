// Interface text in Uzbek, Russian and English. One table so the three languages stay side by side.
// Business words come from the spec's `translations`; product text from `translate: true` fields.
import { app, translations } from '#core/schema'

export type Lang = 'uz' | 'ru' | 'en'
const ORDER: Record<Lang, number> = { uz: 0, ru: 1, en: 2 }
export const LOCALES: Record<Lang, string> = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' }
export const LANGUAGE_NAMES: Record<Lang, string> = { uz: 'Oʻzbekcha', ru: 'Русский', en: 'English' }

const M: Record<string, [string, string, string]> = {
  // Shop
  'shop.add': ['Savatga', 'В корзину', 'Add to cart'],
  'shop.added': ['{name} savatga qoʻshildi', '{name} в корзине', '{name} added to cart'],
  'shop.choose': ['Tanlash', 'Выбрать', 'Choose'],
  'shop.soldOut': ['Qolmagan', 'Нет в наличии', 'Sold out'],
  'shop.left': ['{n} ta qoldi', 'Осталось {n}', '{n} left'],
  'shop.inStock': ['Mavjud', 'В наличии', 'In stock'],
  'shop.quantity': ['Soni', 'Количество', 'Quantity'],
  'shop.soldBy': ['Sotuvchi: {name}', 'Продавец: {name}', 'Sold by {name}'],
  'shop.chooseOption': ['{label} tanlang', 'Выберите: {label}', 'Choose {label}'],
  'shop.search': ['Qidirish', 'Поиск', 'Search'],
  'shop.searchIn': ['{name} ichidan qidirish', 'Поиск: {name}', 'Search {name}'],
  'shop.all': ['Barchasi', 'Все', 'All'],
  'shop.viewAll': ['Barchasini koʻrish', 'Смотреть все', 'View all'],
  'shop.nothing': ['Hech narsa topilmadi', 'Ничего не найдено', 'Nothing found'],
  'shop.emptyList': ['Hozircha boʻsh', 'Пока пусто', 'Nothing here yet'],
  'shop.onSite': ['Sotuvchilar', 'Продавцы', 'Sellers'],
  'cart.title': ['Savat', 'Корзина', 'Cart'],
  'cart.empty': ['Savat boʻsh', 'Корзина пуста', 'Your cart is empty'],
  'cart.start': ['Xaridni boshlash', 'Начать покупки', 'Start shopping'],
  'cart.viewCart': ['Savatni koʻrish', 'Открыть корзину', 'View cart'],
  'cart.subtotal': ['Mahsulotlar', 'Товары', 'Items'],
  'cart.delivery': ['Yetkazib berish', 'Доставка', 'Delivery'],
  'cart.free': ['Bepul', 'Бесплатно', 'Free'],
  'cart.total': ['Jami', 'Итого', 'Total'],
  'cart.checkout': ['Rasmiylashtirish', 'Оформить заказ', 'Checkout'],
  'cart.remove': ['Olib tashlash', 'Убрать', 'Remove'],
  'cart.sellers': ['{n} ta sotuvchidan: har biriga alohida buyurtma va yetkazib berish.', 'От {n} продавцов: отдельный заказ и доставка от каждого.', 'From {n} sellers: one order and delivery fee each.'],
  'checkout.title': ['Buyurtmani rasmiylashtirish', 'Оформление заказа', 'Checkout'],
  'checkout.payment': ['Toʻlov usuli', 'Способ оплаты', 'Payment'],
  'checkout.place': ['Buyurtma berish', 'Заказать', 'Place order'],
  'checkout.placed': ['Buyurtma qabul qilindi', 'Заказ принят', 'Order placed'],
  'checkout.placedNote': ['Tasdiqlash uchun siz bilan bogʻlanamiz.', 'Мы свяжемся с вами для подтверждения.', 'We will contact you to confirm it.'],
  'checkout.failed': ['Buyurtma berib boʻlmadi', 'Не удалось оформить заказ', 'Could not place the order'],
  'checkout.confirmNote': ['Yakuniy summani doʻkon tasdiqlaydi.', 'Итоговую сумму подтвердит магазин.', 'The shop confirms the final total.'],
  'pay.cash': ['Yetkazilganda naqd', 'Наличными при получении', 'Cash on delivery'],
  'pay.click': ['Click', 'Click', 'Click'],
  'pay.payme': ['Payme', 'Payme', 'Payme'],
  'pay.stripe': ['Karta orqali', 'Картой', 'Card'],
  'pay.now': ['Hozir toʻlash', 'Оплатить', 'Pay now'],
  'pay.failed': ['Toʻlovni boshlab boʻlmadi', 'Не удалось начать оплату', 'Could not start the payment'],
  'order.title': ['Buyurtma №{n}', 'Заказ №{n}', 'Order #{n}'],
  'order.cancel': ['Bekor qilish', 'Отменить заказ', 'Cancel order'],
  'order.cancelConfirm': ['Buyurtma bekor qilinsinmi?', 'Отменить заказ?', 'Cancel this order?'],
  'order.cancelled': ['Buyurtma bekor qilindi', 'Заказ отменён', 'Order cancelled'],
  // Forms
  'form.send': ['Yuborish', 'Отправить', 'Send'],
  'form.submit': ['Tasdiqlash', 'Подтвердить', 'Submit'],
  'form.sent': ['Rahmat, xabaringiz qabul qilindi', 'Спасибо, мы получили сообщение', 'Thank you, we received your message'],
  'form.sentNote': ['Tez orada javob beramiz.', 'Мы скоро ответим.', 'We will get back to you soon.'],
  'form.again': ['Yana yuborish', 'Отправить ещё', 'Send another'],
  'form.failed': ['Yuborib boʻlmadi', 'Не удалось отправить', 'Could not send'],
  'form.signInFirst': ['Davom etish uchun kiring', 'Войдите, чтобы продолжить', 'Sign in to continue'],
  'form.signInNote': ['Keyin kuzatib borish uchun hisob kerak.', 'Аккаунт нужен, чтобы следить за статусом.', 'You need an account to follow this later.'],
  'form.saved': ['Saqlandi', 'Сохранено', 'Saved'],
  'form.save': ['Saqlash', 'Сохранить', 'Save'],
  'form.cancel': ['Bekor qilish', 'Отмена', 'Cancel'],
  'form.delete': ['Oʻchirish', 'Удалить', 'Delete'],
  'form.edit': ['Tahrirlash', 'Изменить', 'Edit'],
  'form.add': ['Qoʻshish', 'Добавить', 'Add'],
  'form.new': ['Yangi', 'Создать', 'New'],
  'form.back': ['Orqaga', 'Назад', 'Back'],
  'form.notFound': ['Topilmadi', 'Не найдено', 'Not found'],
  'form.notFoundNote': ['Oʻchirilgan boʻlishi yoki kirish kerak boʻlishi mumkin.', 'Возможно, удалено или нужно войти.', 'It may have been removed, or you may need to sign in.'],
  'form.deleteConfirm': ['{name} oʻchirilsinmi?', 'Удалить {name}?', 'Delete {name}?'],
  'form.cannotUndo': ['Buni qaytarib boʻlmaydi.', 'Это нельзя отменить.', 'This cannot be undone.'],
  'form.couldNotLoad': ['Yuklab boʻlmadi', 'Не удалось загрузить', 'Could not load'],
  'form.selectOption': ['Tanlang', 'Выберите', 'Select'],
  'contact.title': ['Biz bilan bogʻlaning', 'Свяжитесь с нами', 'Contact us'],
  // Validation
  'v.required': ['{label} kiritilishi shart', 'Заполните: {label}', '{label} is required'],
  'v.email': ['Toʻgʻri email kiriting', 'Введите корректный email', 'Enter a valid email address'],
  'v.url': ['https:// bilan boshlanuvchi havola kiriting', 'Введите ссылку с https://', 'Enter a full link starting with https://'],
  'v.whole': ['Butun son kiriting', 'Введите целое число', 'Use a whole number'],
  'v.min': ['Kamida {n}', 'Не меньше {n}', 'Must be at least {n}'],
  'v.max': ['Koʻpi bilan {n}', 'Не больше {n}', 'Must be at most {n}'],
  'v.date': ['Sanani kiriting', 'Введите дату', 'Enter a date'],
  'v.json': ['Toʻgʻri JSON kiriting', 'Введите корректный JSON', 'Enter valid JSON'],
  'v.password': ['Kamida 8 ta belgi', 'Минимум 8 символов', 'Use at least 8 characters'],
  'v.passwordMatch': ['Parollar mos emas', 'Пароли не совпадают', 'Passwords do not match'],
  'v.name': ['Ismingizni kiriting', 'Введите имя', 'Enter your name'],
  // Errors
  'e.unique': ['Bu {field} allaqachon band.', 'Такое значение уже занято: {field}.', 'This {field} is already in use.'],
  'e.exists': ['Bu yozuv allaqachon mavjud.', 'Такая запись уже есть.', 'This record already exists.'],
  'e.linked': ['Boshqa yozuvlar bunga bogʻlangan. Avval ularni oʻzgartiring.', 'На эту запись ссылаются другие. Сначала измените их.', 'Other records still point to this one. Remove or reassign them first.'],
  'e.denied': ['Bunga ruxsatingiz yoʻq.', 'У вас нет прав на это действие.', 'You do not have permission to do that.'],
  'e.value': ['Qiymatlardan biri notoʻgʻri.', 'Одно из значений недопустимо.', 'One of the values is not allowed.'],
  'e.offline': ['Serverga ulanib boʻlmadi. Internetni tekshiring.', 'Нет связи с сервером. Проверьте интернет.', 'Cannot reach the server. Check your connection and try again.'],
  'e.generic': ['Xatolik yuz berdi. Qayta urinib koʻring.', 'Что-то пошло не так. Попробуйте ещё раз.', 'Something went wrong. Please try again.'],
  // Booking
  'book.now': ['Yozilish', 'Записаться', 'Book now'],
  'book.pickService': ['Avval xizmatni tanlang', 'Сначала выберите услугу', 'Choose a service first'],
  'book.day': ['Kun', 'День', 'Day'],
  'book.time': ['Vaqt', 'Время', 'Time'],
  'book.noSlots': ['Bu kunda boʻsh vaqt yoʻq', 'На этот день нет свободного времени', 'No free times on this day'],
  'book.closed': ['Dam olish kuni', 'Выходной', 'Closed'],
  'book.anyone': ['Birinchi boʻsh mutaxassis', 'Первый свободный мастер', 'First available'],
  // Account and auth
  'auth.signIn': ['Kirish', 'Войти', 'Sign in'],
  'auth.signUp': ['Roʻyxatdan oʻtish', 'Регистрация', 'Create account'],
  'auth.signOut': ['Chiqish', 'Выйти', 'Sign out'],
  'auth.welcome': ['Xush kelibsiz', 'С возвращением', 'Welcome back'],
  'auth.createTitle': ['Hisob yarating', 'Создайте аккаунт', 'Create your account'],
  'auth.createNote': ['Bir daqiqadan kam vaqt oladi.', 'Это займёт меньше минуты.', 'It takes less than a minute.'],
  'auth.name': ['Toʻliq ism', 'Полное имя', 'Full name'],
  'auth.email': ['Email', 'Email', 'Email'],
  'auth.password': ['Parol', 'Пароль', 'Password'],
  'auth.forgot': ['Parolni unutdingizmi?', 'Забыли пароль?', 'Forgot password?'],
  'auth.newHere': ['Yangimisiz?', 'Впервые здесь?', 'New here?'],
  'auth.haveAccount': ['Hisobingiz bormi?', 'Уже есть аккаунт?', 'Already have an account?'],
  'auth.checkEmail': ['Emailingizni tekshiring', 'Проверьте почту', 'Check your email'],
  'auth.checkEmailNote': ['{email} manziliga tasdiqlash havolasi yubordik. Uni oching, soʻng shu yerda kiring.', 'Мы отправили ссылку на {email}. Откройте её и войдите здесь.', 'We sent a confirmation link to {email}. Open it, then sign in here.'],
  'auth.backToSignIn': ['Kirishga qaytish', 'Назад ко входу', 'Back to sign in'],
  'auth.resetTitle': ['Parolni tiklash', 'Восстановление пароля', 'Reset your password'],
  'auth.resetNote': ['Yangi parol tanlash havolasini emailga yuboramiz.', 'Отправим на почту ссылку для нового пароля.', 'We will email you a link to choose a new password.'],
  'auth.resetSent': ['Agar {email} uchun hisob boʻlsa, havola yuborildi.', 'Если аккаунт {email} существует, ссылка отправлена.', 'If an account exists for {email}, a reset link is on its way.'],
  'auth.resetSend': ['Havolani yuborish', 'Отправить ссылку', 'Send reset link'],
  'auth.newPassword': ['Yangi parol', 'Новый пароль', 'New password'],
  'auth.confirmPassword': ['Parolni tasdiqlang', 'Повторите пароль', 'Confirm password'],
  'auth.updatePassword': ['Parolni yangilash', 'Обновить пароль', 'Update password'],
  'auth.passwordUpdated': ['Parol yangilandi', 'Пароль обновлён', 'Password updated'],
  'account.title': ['Hisobim', 'Мой аккаунт', 'Your account'],
  'account.your': ['Mening: {name}', 'Мои: {name}', 'Your {name}'],
  'account.staff': ['Xodimlar boʻlimi', 'Панель сотрудника', 'Staff area'],
  'account.sell': ['{name}da sotish', 'Продавать на {name}', 'Sell on {name}'],
  'site.staffSignIn': ['Xodimlar uchun kirish', 'Вход для сотрудников', 'Staff sign in'],
  'site.contact': ['Aloqa', 'Контакты', 'Contact'],
  'site.home': ['Bosh sahifa', 'Главная', 'Home'],
  'site.language': ['Til', 'Язык', 'Language'],
  'site.theme': ['Mavzu', 'Тема', 'Theme'],
  'site.openMenu': ['Menyu', 'Меню', 'Menu'],
  // Staff area
  'app.dashboard': ['Boshqaruv paneli', 'Панель', 'Dashboard'],
  'app.settings': ['Sozlamalar', 'Настройки', 'Settings'],
  'app.members': ['Xodimlar', 'Сотрудники', 'Members'],
  'app.workspace': ['Ishchi hudud', 'Рабочее пространство', 'Workspace'],
  'app.profile': ['Profil', 'Профиль', 'Profile'],
  'app.publicSite': ['Saytni koʻrish', 'Открыть сайт', 'View public site'],
  'app.files': ['Fayllar', 'Файлы', 'Files'],
  'app.photos': ['Rasmlar', 'Фото', 'Photos'],
  'app.upload': ['Yuklash', 'Загрузить', 'Upload'],
  'app.activity': ['Faoliyat', 'История', 'Activity'],
  'app.viewAll': ['Barchasi', 'Все', 'View all'],
  'app.recent': ['Soʻnggi: {name}', 'Недавние: {name}', 'Recent {name}'],
  'app.created': ['{name} yaratildi', '{name}: создано', '{name} created'],
  'app.updated': ['{name} yangilandi', '{name}: обновлено', '{name} updated'],
  'app.deleted': ['{name} oʻchirildi', '{name}: удалено', '{name} deleted'],
  'app.onboardBusiness': ['Biznesingizni sozlang', 'Настройте бизнес', 'Set up your business'],
  'app.onboardShop': ['Doʻkoningizni oching', 'Откройте магазин', 'Open your shop'],
  'app.onboardTeam': ['Ishchi hududni yarating', 'Создайте пространство', 'Create your workspace']
}

// Words used by built-in pages and common field names.
const L: Record<string, [string, string]> = {
  'Order': ['Buyurtma', 'Заказ'], 'Orders': ['Buyurtmalar', 'Заказы'], 'Order #': ['Buyurtma №', 'Заказ №'],
  'Order item': ['Buyurtma qatori', 'Позиция заказа'], 'Order items': ['Buyurtma tarkibi', 'Состав заказа'],
  'Status': ['Holat', 'Статус'], 'Payment': ['Toʻlov', 'Оплата'], 'Paid': ['Toʻlangan', 'Оплата'], 'Total': ['Jami', 'Итого'],
  'Customer': ['Mijoz', 'Клиент'], 'Phone': ['Telefon', 'Телефон'], 'Address': ['Manzil', 'Адрес'], 'Note': ['Izoh', 'Комментарий'],
  'Subtotal': ['Mahsulotlar', 'Товары'], 'Delivery fee': ['Yetkazib berish', 'Доставка'], 'Item': ['Mahsulot', 'Товар'],
  'Price': ['Narx', 'Цена'], 'Quantity': ['Soni', 'Количество'], 'Product': ['Mahsulot', 'Товар'], 'Name': ['Nomi', 'Название'],
  'Description': ['Tavsif', 'Описание'], 'Category': ['Turkum', 'Категория'], 'Categories': ['Turkumlar', 'Категории'],
  'Stock': ['Qoldiq', 'Остаток'], 'Available': ['Mavjud', 'Доступно'], 'Size': ['Oʻlcham', 'Размер'], 'Option': ['Variant', 'Вариант'], 'Options': ['Variantlar', 'Варианты'],
  'Review': ['Sharh', 'Отзыв'], 'Reviews': ['Sharhlar', 'Отзывы'], 'Rating': ['Baho', 'Оценка'], 'Comment': ['Izoh', 'Комментарий'],
  'Message': ['Xabar', 'Сообщение'], 'Messages': ['Xabarlar', 'Сообщения'], 'Date': ['Sana', 'Дата'], 'Time': ['Vaqt', 'Время'],
  'New': ['Yangi', 'Новый'], 'Confirmed': ['Tasdiqlangan', 'Подтверждён'], 'Packed': ['Yigʻilgan', 'Собран'], 'Shipped': ['Yuborilgan', 'Отправлен'],
  'Delivered': ['Yetkazilgan', 'Доставлен'], 'Cancelled': ['Bekor qilingan', 'Отменён'], 'Unpaid': ['Toʻlanmagan', 'Не оплачен'], 'Refunded': ['Qaytarilgan', 'Возврат'],
  'Cash': ['Naqd', 'Наличные'], 'Click': ['Click', 'Click'], 'Payme': ['Payme', 'Payme'], 'Stripe': ['Karta', 'Карта'],
  'Small': ['Kichik', 'Маленький'], 'Medium': ['Oʻrta', 'Средний'], 'Large': ['Katta', 'Большой'],
  'Morning': ['Ertalab', 'Утро'], 'Afternoon': ['Kunduzi', 'День'], 'Evening': ['Kechqurun', 'Вечер'],
  'Requested': ['Soʻralgan', 'Запрошено'], 'Completed': ['Bajarilgan', 'Завершено'], 'Answered': ['Javob berilgan', 'Отвечено']
}

const fallback = (): Lang => (app.languages?.[0] ?? 'uz') as Lang

export function currentLang(): Lang {
  const state = tryUseNuxtApp()?.payload.state as Record<string, unknown> | undefined
  return (state?.$slang as Lang | undefined) ?? fallback()
}
export const currentLocale = () => LOCALES[currentLang()]

// Interface text: t('cart.total'), t('shop.left', { n: 3 })
export function t(key: string, vars: Record<string, string | number> = {}): string {
  const row = M[key]
  const text = row?.[ORDER[currentLang()]] ?? key
  return text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

// A word from the spec or a common label, in the current language.
export function tl(label: string): string {
  const lang = currentLang()
  const own = (translations as Record<string, Record<string, string>>)[lang]?.[label]
  if (own) return own
  if (lang === 'en') return label
  return L[label]?.[ORDER[lang]] ?? label
}

// Product text for the current language, falling back to the original.
export function localized(row: Record<string, any>, name: string) {
  const v = row[`${name}_${currentLang()}`]
  return v === null || v === undefined || v === '' ? row[name] : v
}
