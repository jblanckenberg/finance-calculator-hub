"""Tests for the render_intro_html() markdown-lite renderer."""
from generate import render_intro_html

def test_plain_paragraph_wraps_in_p():
    out = render_intro_html("Just plain text.")
    assert out == "<p>Just plain text.</p>"

def test_bold_inside_paragraph():
    out = render_intro_html("Text with **important** words.")
    assert "<strong>important</strong>" in out
    assert out.startswith("<p>")

def test_paragraph_of_dash_lines_becomes_ul():
    out = render_intro_html("- one\n- two\n- three")
    assert out.startswith("<ul>")
    assert "<li>one</li>" in out
    assert "<li>two</li>" in out
    assert "<li>three</li>" in out
    assert out.endswith("</ul>")

def test_bold_inside_bullet_renders():
    out = render_intro_html("- **Cost**: $50\n- **Revenue**: $200")
    assert "<strong>Cost</strong>" in out
    assert "<strong>Revenue</strong>" in out

def test_html_escaping_prevents_injection():
    out = render_intro_html("Plain <script>alert(1)</script> text.")
    assert "&lt;script&gt;" in out
    assert "<script>" not in out

def test_mixed_paragraph_and_list():
    intro = "Lead paragraph.\n\n- Bullet one\n- Bullet two\n\nClosing paragraph."
    out = render_intro_html(intro)
    parts = out.split("\n")
    assert parts[0] == "<p>Lead paragraph.</p>"
    assert "<ul>" in out
    assert out.endswith("<p>Closing paragraph.</p>")

def test_empty_intro_returns_empty():
    assert render_intro_html("") == ""

def test_mixed_lines_with_one_non_dash_falls_back_to_p():
    out = render_intro_html("- one\nMix in narrative\n- two")
    assert out.startswith("<p>")
    assert "<ul>" not in out
