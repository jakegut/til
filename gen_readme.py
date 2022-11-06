import glob
import frontmatter
import datetime

mds = glob.glob("./**/*.md")

byTag = {}

for md in mds:
    s = md.split("/")
    tag = s[1]
    slug = s[2].replace(".md", "")
    if tag not in byTag:
        byTag[tag] = []
    front = frontmatter.load(md)
    byTag[tag].append({
        "title": front['title'],
        "date": datetime.datetime.strptime(front['pubDate'], '%b %d %Y'),
        "url": f'https://til.jakegut.com/{slug}'
    })

print("""# Jake Gutierrez's TIL

Some things I've learned. Inspired by [simonw/ti](https://github.com/simonw/til).

Browse them at https://til.jakegut.com
""")

for tag, posts in byTag.items():
    print(f"## {tag}")
    for post in posts:
        print(f"* [{post['title']}]({post['url']}) *{post['date'].strftime('%b %d %Y')}*")
    