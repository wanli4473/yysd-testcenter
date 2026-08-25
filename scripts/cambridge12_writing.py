"""Cambridge IELTS 12 Tests 1–4 academic writing data."""

from __future__ import annotations


def writing_tests():
    return {1: _t1, 2: _t2, 3: _t3, 4: _t4}


def _w(t1_prompt, caption, image, t2_topic, t2_question):
    return {
        "durationMin": 60,
        "task1": {
            "prompt": (
                "You should spend about 20 minutes on this task.<br><br>"
                f"{t1_prompt}<br><br>"
                "Summarise the information by selecting and reporting the main features, "
                "and make comparisons where relevant.<br><strong>Write at least 150 words.</strong>"
            ),
            "charts": [{"caption": caption, "image": image}],
        },
        "task2": {
            "prompt": (
                "You should spend about 40 minutes on this task.<br><br>"
                "Write about the following topic:<br><br>"
                f"<strong>{t2_topic}</strong><br><br>"
                f"{t2_question}<br><br>"
                "Give reasons for your answer and include any relevant examples from your own "
                "knowledge or experience.<br><strong>Write at least 250 words.</strong>"
            ),
        },
    }


_t1 = _w(
    "The bar chart below shows the percentage of Australian men and women in different age groups who did regular physical activity in 2010.",
    "Percentage of Australian men and women doing regular physical activity: 2010",
    "cambridge-12-t1_activity.png",
    "Some people believe that it is good to share as much information as possible in scientific research, business and the academic world. Others believe that some information is too important or too valuable to be shared freely.",
    "Discuss both these views and give your own opinion.",
)

_t2 = _w(
    "The maps below show the centre of a small town called Islip as it is now, and plans for its development.",
    "Islip town centre now and planned development",
    "cambridge-12-t2_islip.png",
    "At the present time, the population of some countries includes a relatively large number of young adults, compared with the number of older people.",
    "Do the advantages of this situation outweigh the disadvantages?",
)

_t3 = _w(
    "The chart below shows how frequently people in the USA ate in fast food restaurants between 2003 and 2013.",
    "Frequency of eating at fast food restaurants among people in the USA (2003–2013)",
    "cambridge-12-t3_fastfood.png",
    "In a number of countries, some people think it is necessary to spend large sums of money on constructing new railway lines for very fast trains between cities. Others believe the money should be spent on improving existing public transport.",
    "Discuss both these views and give your own opinion.",
)

_t4 = _w(
    "The diagram below shows how geothermal energy is used to produce electricity.",
    "Geothermal power plant",
    "cambridge-12-t4_geothermal.png",
    "Some people believe that allowing children to make their own choices on everyday matters (such as food, clothes and entertainment) is likely to result in a society of individuals who only think about their own wishes. Other people believe that it is important for children to make decisions about matters that affect them.",
    "Discuss both these views and give your own opinion.",
)
