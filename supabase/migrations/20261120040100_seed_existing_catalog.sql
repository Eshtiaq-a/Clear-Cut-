insert into public.categories (name, slug, sort_order, is_active)
values
  ('All Deals', 'all-deals', 0, true),
  ('Electronics', 'electronics', 1, true),
  ('Smartphones', 'smartphones', 2, true),
  ('Laptops & Computers', 'laptops-computers', 3, true),
  ('Accessories', 'accessories', 4, true),
  ('Fashion & Clothing', 'fashion-clothing', 5, true),
  ('Shoes', 'shoes', 6, true),
  ('Home & Living', 'home-living', 7, true),
  ('Kitchen & Appliances', 'kitchen-appliances', 8, true),
  ('Beauty & Personal Care', 'beauty-personal-care', 9, true),
  ('Groceries & Food', 'groceries-food', 10, true),
  ('Gaming', 'gaming', 11, true),
  ('Sports & Fitness', 'sports-fitness', 12, true),
  ('Books & Stationery', 'books-stationery', 13, true),
  ('Furniture', 'furniture', 14, true),
  ('Baby & Kids', 'baby-kids', 15, true),
  ('Travel & Lifestyle', 'travel-lifestyle', 16, true)
on conflict (slug) do update
set name = excluded.name,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active;

insert into public.seller_profiles (business_name, slug, location, verification_status, verified_at)
values
  ('Mobile Hub Dhaka', 'mobile-hub-dhaka', 'Dhaka', 'verified', now()),
  ('Apple District', 'apple-district', 'Dhaka', 'verified', now()),
  ('Lenovo City Store', 'lenovo-city-store', 'Dhaka', 'verified', now()),
  ('Hearth Kitchen', 'hearth-kitchen', 'Dhaka', 'verified', now()),
  ('SoftNest Home', 'softnest-home', 'Dhaka', 'verified', now()),
  ('HomePro Appliances', 'homepro-appliances', 'Dhaka', 'verified', now())
on conflict (slug) do update
set business_name = excluded.business_name,
    location = excluded.location;

with seed(legacy_key, name, name_bn, description, description_bn, category_slug, brand, original_price_bdt, current_price_bdt, featured, remaining_stock, expiry_date, status, keywords, image, condition, highlights, specifications, seller_slug) as (
  values
    ('LC-001','Premium Greek Yogurt','প্রিমিয়াম গ্রিক ইয়োগার্ট','Creamy plain Greek yogurt with 12g of protein per serving.',null,'groceries-food','DailyFresh',490,320,true,8,'2026-12-05','active','{yogurt,dairy,protein,breakfast}','https://images.unsplash.com/photo-1488477181946-6428a0291777',null,'[]','[]',null),
    ('LC-002','Artisan Brown Bread','আর্টিসান ব্রাউন ব্রেড','Whole-grain artisan bread, best enjoyed toasted.',null,'groceries-food','Nourish',210,145,false,14,'2026-12-03','active','{bread,bakery,wholegrain,toast}','https://images.unsplash.com/photo-1509440159596-0249088772ff',null,'[]','[]',null),
    ('LC-003','Organic Fresh Strawberries','অর্গানিক ফ্রেশ স্ট্রবেরি','A pack of naturally sweet strawberries.',null,'groceries-food','Green Basket',400,280,true,5,'2026-12-02','active','{berries,fruit,fresh,organic}','https://images.unsplash.com/photo-1464965911861-746a04b4bca6',null,'[]','[]',null),
    ('LC-004','Classic Cotton T-Shirt','ক্লাসিক কটন টি-শার্ট','Soft everyday cotton tee in a relaxed regular fit.',null,'fashion-clothing','Thread & Co.',1200,650,true,21,null,'active','{tshirt,cotton,shirt,mens,womens}','https://images.unsplash.com/photo-1521572163474-6864f9cf17ab',null,'[]','[]',null),
    ('LC-005','Everyday Denim Jacket','ডেনিম জ্যাকেট','Versatile medium-blue denim jacket with a classic collar.',null,'fashion-clothing','Urban Loom',3200,1850,false,7,null,'active','{denim,jacket,outerwear,clothing}','https://images.unsplash.com/photo-1551028719-00167b16eac5',null,'[]','[]',null),
    ('LC-006','Hydrating Face Serum','হাইড্রেটিং ফেস সিরাম','Lightweight hydration serum for dry and dull skin.',null,'beauty-personal-care','Amara Skin',1450,890,true,11,'2027-08-30','active','{serum,skincare,hydrating,face,beauty}','https://images.unsplash.com/photo-1620916566398-39f1143ab7be',null,'[]','[]',null),
    ('LC-007','Natural Lip Balm Set','ন্যাচারাল লিপ বাম সেট','Three moisturizing lip balms made with natural oils.',null,'beauty-personal-care','Petal Care',650,420,false,18,'2027-02-28','active','{lip-balm,beauty,moisturizer,set}','https://images.unsplash.com/photo-1596462502278-27bfdc403348',null,'[]','[]',null),
    ('LC-008','Samsung Galaxy A55 5G','স্যামসাং গ্যালাক্সি A55','A premium mid-range 5G smartphone with 128GB storage.',null,'smartphones','Samsung',44999,34500,true,4,null,'active','{samsung,phone,android,mobile,5g,smartphone}','https://images.unsplash.com/photo-1598327105666-5b89351aff97','Demo clearance stock','["128GB storage","5G connectivity"]','[{"label":"Storage","value":"128GB"},{"label":"Connectivity","value":"5G"}]','mobile-hub-dhaka'),
    ('LC-009','Apple iPhone 15','অ্যাপল আইফোন ১৫','Unlocked 128GB smartphone in a clean condition.',null,'smartphones','Apple',112000,89500,true,3,null,'active','{iphone,apple,phone,ios,smartphone}','https://images.unsplash.com/photo-1695048133142-1a20484d2569','Clean clearance stock','["128GB storage","Unlocked"]','[{"label":"Storage","value":"128GB"},{"label":"Connectivity","value":"Unlocked"}]','apple-district'),
    ('LC-010','Lenovo IdeaPad Slim 5','লেনোভো আইডিয়াপ্যাড','14-inch productivity laptop with 16GB RAM.',null,'laptops-computers','Lenovo',82000,68500,true,6,null,'active','{laptop,computer,lenovo,notebook,office}','https://images.unsplash.com/photo-1496181133206-80ce9b88a853',null,'["16GB RAM","14-inch display"]','[{"label":"Memory","value":"16GB RAM"},{"label":"Display","value":"14-inch"}]','lenovo-city-store'),
    ('LC-011','Wireless Noise-Canceling Earbuds','ওয়্যারলেস নোয়েজ-ক্যান্সেলিং ইয়ারবাডস','Compact true-wireless earbuds with an enclosed charging case.',null,'accessories','Nova Audio',4200,2450,true,4,null,'active','{earbuds,headphones,wireless,audio,accessory}','https://images.unsplash.com/photo-1598331668826-20cecc7c1c01',null,'[]','[]',null),
    ('LC-012','Portable Desk Lamp','পোর্টেবল ডেস্ক ল্যাম্প','Rechargeable LED desk lamp with warm and cool light modes.',null,'electronics','Lumio',1850,1150,false,9,null,'active','{lamp,led,desk,lighting,electronics}','https://images.unsplash.com/photo-1507473885765-e6ed057f782c',null,'[]','[]',null),
    ('LC-013','Running Sneakers','রানিং স্নিকার','Lightweight cushioned sneakers for walking and running.',null,'shoes','Stride',4800,2950,true,12,null,'active','{shoes,sneakers,running,trainer,footwear}','https://images.unsplash.com/photo-1542291026-7eec264c27ff',null,'[]','[]',null),
    ('LC-014','Ceramic Pour-Over Coffee Set','সিরামিক পোর-ওভার কফি সেট','Stoneware dripper and mug set for a clean hand-brewed coffee.',null,'kitchen-appliances','Hearth',2200,1320,true,6,null,'active','{coffee,kitchen,ceramic,dripper,appliance}','https://images.unsplash.com/photo-1495474472287-4d71bcdd2085',null,'["Stoneware dripper","Matching mug"]','[{"label":"Material","value":"Stoneware"}]','hearth-kitchen'),
    ('LC-015','Organic Cotton Bath Towel','অর্গানিক কটন বাথ টাওয়েল','Highly absorbent bath towel woven from organic cotton.',null,'home-living','SoftNest',1300,780,false,16,null,'active','{towel,bath,cotton,home,living}','https://images.unsplash.com/photo-1600369672770-985fd30004eb',null,'["Organic cotton","Highly absorbent"]','[{"label":"Material","value":"Organic cotton"}]','softnest-home'),
    ('LC-016','Air Fryer Compact 4L','কম্প্যাক্ট এয়ার ফ্রায়ার','Compact 4-litre air fryer with digital controls.',null,'kitchen-appliances','HomePro',8900,6200,true,5,null,'active','{air-fryer,kitchen,appliance,cooking,digital}','https://images.unsplash.com/photo-1585515320310-259814833e62',null,'["4-litre capacity","Digital controls"]','[{"label":"Capacity","value":"4 litres"},{"label":"Controls","value":"Digital"}]','homepro-appliances'),
    ('LC-017','Xbox Wireless Controller','এক্সবক্স কন্ট্রোলার','Ergonomic wireless controller for compatible gaming devices.',null,'gaming','Microsoft',6800,4800,true,8,null,'active','{xbox,controller,gaming,console,wireless}','https://images.unsplash.com/photo-1592840062661-a5a7f78e2056',null,'[]','[]',null),
    ('LC-018','Yoga Mat Set','যোগা ম্যাট সেট','Cushioned nonslip mat with carry strap.',null,'sports-fitness','FlexFit',2200,1450,false,14,null,'active','{yoga,fitness,mat,exercise,sports}','https://images.unsplash.com/photo-1599447421416-3414500d18a5',null,'[]','[]',null),
    ('LC-019','Bangla Bestseller Book Set','বাংলা বেস্টসেলার বই সেট','A curated set of three contemporary Bangla novels.',null,'books-stationery','Boighar',1450,980,false,20,null,'active','{books,bangla,novel,stationery,reading}','https://images.unsplash.com/photo-1544947950-fa07a98d237f',null,'[]','[]',null),
    ('LC-020','Modern Accent Chair','মডার্ন অ্যাকসেন্ট চেয়ার','Compact upholstered chair for living rooms and bedrooms.',null,'furniture','Hearth & Home',10500,7200,true,3,null,'active','{chair,furniture,accent,living-room,seat}','https://images.unsplash.com/photo-1567538096630-e0c55bd6374c',null,'[]','[]',null),
    ('LC-021','Kids Activity Backpack','কিডস অ্যাক্টিভিটি ব্যাকপ্যাক','Colorful lightweight backpack with organizer pockets.',null,'baby-kids','LittleJoy',1700,1150,false,15,null,'active','{kids,baby,backpack,school,children}','https://images.unsplash.com/photo-1553062407-98eeb64c6a62',null,'[]','[]',null),
    ('LC-022','Weekender Travel Bag','উইকেন্ডার ট্রাভেল ব্যাগ','Cabin-friendly duffel bag with separate shoe compartment.',null,'travel-lifestyle','Roam',3900,2650,true,9,null,'active','{travel,bag,luggage,duffel,lifestyle}','https://images.unsplash.com/photo-1553062407-98eeb64c6a62',null,'[]','[]',null)
)
insert into public.products (
  legacy_key, seller_id, category_id, name, name_bn, description, description_bn,
  brand, condition, original_price_bdt, current_price_bdt, featured, status,
  keywords, highlights, specifications, expiry_date
)
select
  s.legacy_key,
  sp.id,
  c.id,
  s.name,
  s.name_bn,
  s.description,
  s.description_bn,
  s.brand,
  s.condition,
  s.original_price_bdt,
  s.current_price_bdt,
  s.featured,
  s.status,
  s.keywords,
  s.highlights::jsonb,
  s.specifications::jsonb,
  s.expiry_date::date
from seed s
join public.categories c on c.slug = s.category_slug
left join public.seller_profiles sp on sp.slug = s.seller_slug
on conflict (legacy_key) do update
set seller_id = excluded.seller_id,
    category_id = excluded.category_id,
    name = excluded.name,
    name_bn = excluded.name_bn,
    description = excluded.description,
    brand = excluded.brand,
    condition = excluded.condition,
    original_price_bdt = excluded.original_price_bdt,
    current_price_bdt = excluded.current_price_bdt,
    featured = excluded.featured,
    keywords = excluded.keywords,
    highlights = excluded.highlights,
    specifications = excluded.specifications,
    expiry_date = excluded.expiry_date;

with seed(legacy_key, remaining_stock, expiry_date, image) as (
  values
    ('LC-001',8,'2026-12-05','https://images.unsplash.com/photo-1488477181946-6428a0291777'),
    ('LC-002',14,'2026-12-03','https://images.unsplash.com/photo-1509440159596-0249088772ff'),
    ('LC-003',5,'2026-12-02','https://images.unsplash.com/photo-1464965911861-746a04b4bca6'),
    ('LC-004',21,null,'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab'),
    ('LC-005',7,null,'https://images.unsplash.com/photo-1551028719-00167b16eac5'),
    ('LC-006',11,'2027-08-30','https://images.unsplash.com/photo-1620916566398-39f1143ab7be'),
    ('LC-007',18,'2027-02-28','https://images.unsplash.com/photo-1596462502278-27bfdc403348'),
    ('LC-008',4,null,'https://images.unsplash.com/photo-1598327105666-5b89351aff97'),
    ('LC-009',3,null,'https://images.unsplash.com/photo-1695048133142-1a20484d2569'),
    ('LC-010',6,null,'https://images.unsplash.com/photo-1496181133206-80ce9b88a853'),
    ('LC-011',4,null,'https://images.unsplash.com/photo-1598331668826-20cecc7c1c01'),
    ('LC-012',9,null,'https://images.unsplash.com/photo-1507473885765-e6ed057f782c'),
    ('LC-013',12,null,'https://images.unsplash.com/photo-1542291026-7eec264c27ff'),
    ('LC-014',6,null,'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085'),
    ('LC-015',16,null,'https://images.unsplash.com/photo-1600369672770-985fd30004eb'),
    ('LC-016',5,null,'https://images.unsplash.com/photo-1585515320310-259814833e62'),
    ('LC-017',8,null,'https://images.unsplash.com/photo-1592840062661-a5a7f78e2056'),
    ('LC-018',14,null,'https://images.unsplash.com/photo-1599447421416-3414500d18a5'),
    ('LC-019',20,null,'https://images.unsplash.com/photo-1544947950-fa07a98d237f'),
    ('LC-020',3,null,'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c'),
    ('LC-021',15,null,'https://images.unsplash.com/photo-1553062407-98eeb64c6a62'),
    ('LC-022',9,null,'https://images.unsplash.com/photo-1553062407-98eeb64c6a62')
)
insert into public.inventory_lots (legacy_key, product_id, seller_id, expiry_date, quantity_available, quantity_reserved, quantity_sold, status)
select
  'lot-' || s.legacy_key,
  p.id,
  p.seller_id,
  s.expiry_date::date,
  s.remaining_stock,
  0,
  0,
  'active'
from seed s
join public.products p on p.legacy_key = s.legacy_key
on conflict (legacy_key) do nothing;

with seed(legacy_key, image) as (
  values
    ('LC-001','https://images.unsplash.com/photo-1488477181946-6428a0291777'),
    ('LC-002','https://images.unsplash.com/photo-1509440159596-0249088772ff'),
    ('LC-003','https://images.unsplash.com/photo-1464965911861-746a04b4bca6'),
    ('LC-004','https://images.unsplash.com/photo-1521572163474-6864f9cf17ab'),
    ('LC-005','https://images.unsplash.com/photo-1551028719-00167b16eac5'),
    ('LC-006','https://images.unsplash.com/photo-1620916566398-39f1143ab7be'),
    ('LC-007','https://images.unsplash.com/photo-1596462502278-27bfdc403348'),
    ('LC-008','https://images.unsplash.com/photo-1598327105666-5b89351aff97'),
    ('LC-009','https://images.unsplash.com/photo-1695048133142-1a20484d2569'),
    ('LC-010','https://images.unsplash.com/photo-1496181133206-80ce9b88a853'),
    ('LC-011','https://images.unsplash.com/photo-1598331668826-20cecc7c1c01'),
    ('LC-012','https://images.unsplash.com/photo-1507473885765-e6ed057f782c'),
    ('LC-013','https://images.unsplash.com/photo-1542291026-7eec264c27ff'),
    ('LC-014','https://images.unsplash.com/photo-1495474472287-4d71bcdd2085'),
    ('LC-015','https://images.unsplash.com/photo-1600369672770-985fd30004eb'),
    ('LC-016','https://images.unsplash.com/photo-1585515320310-259814833e62'),
    ('LC-017','https://images.unsplash.com/photo-1592840062661-a5a7f78e2056'),
    ('LC-018','https://images.unsplash.com/photo-1599447421416-3414500d18a5'),
    ('LC-019','https://images.unsplash.com/photo-1544947950-fa07a98d237f'),
    ('LC-020','https://images.unsplash.com/photo-1567538096630-e0c55bd6374c'),
    ('LC-021','https://images.unsplash.com/photo-1553062407-98eeb64c6a62'),
    ('LC-022','https://images.unsplash.com/photo-1553062407-98eeb64c6a62')
)
insert into public.product_images (product_id, storage_path, alt_text, sort_order, is_primary)
select p.id, s.image, p.name, 0, true
from seed s
join public.products p on p.legacy_key = s.legacy_key
on conflict (product_id, storage_path) do update
set alt_text = excluded.alt_text,
    sort_order = 0,
    is_primary = true;
