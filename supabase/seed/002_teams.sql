insert into teams (name, code, group_name, flag_emoji) values
  ('Mexico', 'MEX', 'A', '🇲🇽'),
  ('South Africa', 'RSA', 'A', '🇿🇦'),
  ('South Korea', 'KOR', 'A', '🇰🇷'),
  ('Czech Republic', 'CZE', 'A', '🇨🇿'),

  ('Canada', 'CAN', 'B', '🇨🇦'),
  ('Qatar', 'QAT', 'B', '🇶🇦'),
  ('Switzerland', 'SUI', 'B', '🇨🇭'),
  ('Bosnia and Herzegovina', 'BIH', 'B', '🇧🇦'),

  ('Brazil', 'BRA', 'C', '🇧🇷'),
  ('Morocco', 'MAR', 'C', '🇲🇦'),
  ('Haiti', 'HAI', 'C', '🇭🇹'),
  ('Scotland', 'SCO', 'C', '🏴'),

  ('United States', 'USA', 'D', '🇺🇸'),
  ('Paraguay', 'PAR', 'D', '🇵🇾'),
  ('Australia', 'AUS', 'D', '🇦🇺'),
  ('Turkiye', 'TUR', 'D', '🇹🇷'),

  ('Germany', 'GER', 'E', '🇩🇪'),
  ('Ecuador', 'ECU', 'E', '🇪🇨'),
  ('Curacao', 'CUW', 'E', '🇨🇼'),
  ('Ivory Coast', 'CIV', 'E', '🇨🇮'),

  ('Netherlands', 'NED', 'F', '🇳🇱'),
  ('Japan', 'JPN', 'F', '🇯🇵'),
  ('Sweden', 'SWE', 'F', '🇸🇪'),
  ('Tunisia', 'TUN', 'F', '🇹🇳'),

  ('Belgium', 'BEL', 'G', '🇧🇪'),
  ('Egypt', 'EGY', 'G', '🇪🇬'),
  ('IR Iran', 'IRN', 'G', '🇮🇷'),
  ('New Zealand', 'NZL', 'G', '🇳🇿'),

  ('Spain', 'ESP', 'H', '🇪🇸'),
  ('Uruguay', 'URU', 'H', '🇺🇾'),
  ('Saudi Arabia', 'KSA', 'H', '🇸🇦'),
  ('Cabo Verde', 'CPV', 'H', '🇨🇻'),

  ('France', 'FRA', 'I', '🇫🇷'),
  ('Senegal', 'SEN', 'I', '🇸🇳'),
  ('Iraq', 'IRQ', 'I', '🇮🇶'),
  ('Norway', 'NOR', 'I', '🇳🇴'),

  ('Argentina', 'ARG', 'J', '🇦🇷'),
  ('Algeria', 'ALG', 'J', '🇩🇿'),
  ('Austria', 'AUT', 'J', '🇦🇹'),
  ('Jordan', 'JOR', 'J', '🇯🇴'),

  ('Portugal', 'POR', 'K', '🇵🇹'),
  ('DR Congo', 'COD', 'K', '🇨🇩'),
  ('Uzbekistan', 'UZB', 'K', '🇺🇿'),
  ('Colombia', 'COL', 'K', '🇨🇴'),

  ('England', 'ENG', 'L', '🏴'),
  ('Croatia', 'CRO', 'L', '🇭🇷'),
  ('Ghana', 'GHA', 'L', '🇬🇭'),
  ('Panama', 'PAN', 'L', '🇵🇦')
on conflict (code) do update set
  name = excluded.name,
  group_name = excluded.group_name,
  flag_emoji = excluded.flag_emoji;
