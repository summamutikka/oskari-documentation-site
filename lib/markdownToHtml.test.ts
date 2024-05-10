
import { insertIdsToHeaders } from "./markdownToHtml";
import slugify from 'slugify';

const createTestHtml = () => {
  const originals = [];
  const expecteds = [];
  for (let first = 1; first < 4; first++) {
    originals.push('<h1>'+first+'</h1>')
    expecteds.push('<h1 id="'+first+'">' + first + ' ' + first + '</h1>')
    for (let second = 1; second < 4; second++) {
      const joinedSecond = [first, second].join('.');
      originals.push('<h2>' + joinedSecond + '</h2>')
      expecteds.push('<h2 id="' + joinedSecond + '">' + joinedSecond + ' ' + joinedSecond + '</h2>')
      for (let third = 1; third < 4; third++) {
        const joinedThird = [first, second, third].join('.');
        originals.push('<h3>' + joinedThird + '</h3>')
        expecteds.push('<h3 id="' + joinedThird + '">' + joinedThird + ' ' + joinedThird + '</h3>')
      }
    }
  }

  return {
    originals,
    expecteds
  }
}

describe('markdownToHtml tests', () => {
  describe('insert ids to headers tests', () => {
    it('should prefix heading with "1" and have the slug as id', () => {
      const h1Content = 'FUU FUU FUU FUU';
      const h1ExpectedContent = '1 FUU';
      const h1ExpectedId = 'id="'+slugify(h1Content)+'"';
      const originalHtml = '<div><h1>'+h1Content+'</h1></div>';

      const processedHTML = insertIdsToHeaders(originalHtml, '1');
      expect(processedHTML?.html?.indexOf(h1ExpectedContent)).toBeGreaterThan(-1);
      expect(processedHTML?.html?.indexOf(h1ExpectedId)).toBeGreaterThan(-1);
    });

    it('should handle headings\' semantic numbering', () => {

      const generated = createTestHtml();
      // <div><h1>1</h1><h2>1.1</h2>.....
      const originalHtml = '<div>' + generated.originals.join('') + '</div>';
      // <div><h1 id="1">1 1</h1><h2 id="1.1">1.1 1.1</h2>....
      const expectedHtml = '<div>' + generated.expecteds.join('') + '</div>';

//      console.log(originalHtml);
//      console.log(expectedHtml);
      const processedHTML = insertIdsToHeaders(originalHtml, '1');
      expect(processedHTML?.html).toEqual(expectedHtml);
    });
  });
});